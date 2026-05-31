#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";

const STATUSES = new Set([
  "pending",
  "in_progress",
  "repairing",
  "passed",
  "passed_with_issues",
  "blocked",
  "failed",
]);

const HELP = `Usage:
  pnpm ai:run <initiative-key> [options]
  node tools/ai-runner/index.mjs <initiative-key> [options]

Options:
  --check-only              Validate initiative structure/readiness without executing.
  --dry-run                 Build the next phase prompt without invoking Codex.
  --once                    Execute only one phase.
  --max-retries <n>         Repair attempts per phase. Default: 3.
  --agent-command <command> Command used to execute a prompt. Default: codex exec --cd <repo> --sandbox danger-full-access -
  --help                    Show this help.

Examples:
  pnpm ai:run my-initiative -- --dry-run
  pnpm ai:run my-initiative -- --check-only
  pnpm ai:run my-initiative -- --once --max-retries 2
`;

function parseArgs(argv) {
  const args = argv.filter((arg) => arg !== "--");
  const options = {
    dryRun: false,
    checkOnly: false,
    once: false,
    maxRetries: 3,
    agentCommand: null,
  };

  if (args.includes("--help") || args.length === 0) {
    return { help: true, options };
  }

  const initiative = args.shift();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--check-only") options.checkOnly = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--once") options.once = true;
    else if (arg === "--max-retries") {
      const value = Number(args[++i]);
      if (!Number.isInteger(value) || value < 0)
        throw new Error("--max-retries must be a non-negative integer");
      options.maxRetries = value;
    } else if (arg === "--agent-command") {
      options.agentCommand = args[++i];
      if (!options.agentCommand)
        throw new Error("--agent-command requires a value");
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return { help: false, initiative, options };
}

function repoRoot() {
  if (process.env.FPH_AI_RUNNER_ROOT) {
    return path.resolve(process.env.FPH_AI_RUNNER_ROOT);
  }
  return path.resolve(new URL("../../", import.meta.url).pathname);
}

function readText(file) {
  return readFileSync(file, "utf8");
}

function writeText(file, text) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => path.join(dir, name));
}

function phaseNumberOf(file) {
  const name = path.basename(file);
  const match = name.match(/^phase-(\d+)-.+\.md$/);
  if (!match)
    throw new Error(
      `Invalid phase filename, expected phase-<number>-<slug>.md: ${name}`,
    );
  return Number(match[1]);
}

function listPhaseFiles(phasesDir) {
  const files = listMarkdownFiles(phasesDir);
  const seen = new Map();
  for (const file of files) {
    const number = phaseNumberOf(file);
    if (seen.has(number)) {
      throw new Error(
        `Duplicate phase number ${number}: ${path.basename(seen.get(number))} and ${path.basename(file)}`,
      );
    }
    seen.set(number, file);
  }
  return files.sort((a, b) => phaseNumberOf(a) - phaseNumberOf(b));
}

function statusOf(markdown) {
  const match = markdown.match(/^Status:\s*([a-z_]+)\s*$/im);
  if (!match) return "pending";
  const status = match[1];
  if (status === "completed" || status === "done") {
    throw new Error(
      `Non-canonical phase status: ${status}. Use passed, passed_with_issues, blocked, or failed.`,
    );
  }
  if (!STATUSES.has(status)) throw new Error(`Unknown phase status: ${status}`);
  return status;
}

function setStatus(markdown, status) {
  if (!STATUSES.has(status)) throw new Error(`Invalid status: ${status}`);
  if (/^Status:\s*[a-z_]+\s*$/im.test(markdown)) {
    return markdown.replace(/^Status:\s*[a-z_]+\s*$/im, `Status: ${status}`);
  }
  return markdown.replace(
    /^# .+$/m,
    (title) => `${title}\n\nStatus: ${status}`,
  );
}

function titleOf(markdown, fallback) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

function initiativeMeta(markdown) {
  const status =
    markdown
      .match(/^-\s*Status:\s*(.+?)\s*$/im)?.[1]
      ?.trim()
      .toLowerCase() ?? "";
  const ready =
    markdown
      .match(/^-\s*Ready for execution:\s*(.+?)\s*$/im)?.[1]
      ?.trim()
      .toLowerCase() ?? "";
  const started =
    markdown
      .match(/^-\s*Execution started:\s*(.+?)\s*$/im)?.[1]
      ?.trim()
      .toLowerCase() ?? "";
  return { status, ready, started };
}

function dependencyKeys(markdown) {
  const match = markdown.match(/^depends_on:\s*(.+?)\s*$/im);
  if (!match) return [];
  const raw = match[1].trim();
  if (!raw || raw === "[]" || raw.toLowerCase() === "none") return [];
  if (raw.startsWith("[") && raw.endsWith("]")) {
    return raw
      .slice(1, -1)
      .split(",")
      .map((item) => item.replaceAll(/["']/g, "").trim())
      .filter(Boolean);
  }
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractVerificationCommands(markdown) {
  const section =
    markdown.match(
      /^## Verification Commands\s*$([\s\S]*?)(?=^## |\z)/im,
    )?.[1] ?? "";
  const commands = [];
  for (const line of section.split("\n")) {
    const tick = line.match(/`([^`]+)`/);
    if (tick) commands.push(tick[1].trim());
  }
  return commands;
}

function loadContext(root, initiativeDir, phaseFile) {
  const files = [
    path.join(root, "AGENTS.md"),
    path.join(root, ".ai/README.md"),
    ...listMarkdownFiles(path.join(root, ".ai/core")),
    ...listMarkdownFiles(path.join(root, ".ai/state")),
    ...listMarkdownFiles(initiativeDir).filter(
      (file) => !file.includes(`${path.sep}reports${path.sep}`),
    ),
    phaseFile,
  ];

  return files
    .filter(
      (file, index, all) => existsSync(file) && all.indexOf(file) === index,
    )
    .map(
      (file) =>
        `\n\n---\nFILE: ${path.relative(root, file)}\n---\n${readText(file)}`,
    )
    .join("");
}

function buildPrompt(
  root,
  initiativeKey,
  initiativeDir,
  phaseFile,
  repairContext = "",
) {
  const phaseMarkdown = readText(phaseFile);
  return `Use the project-memory-execution skill.\n\nInitiative: ${initiativeKey}\nActive phase file: ${path.relative(root, phaseFile)}\n\nExecute exactly this phase and no later phase. Follow .ai hard stops, update required .ai/state files, write the phase report, and run the phase verification commands. Preserve unrelated dirty worktree changes.\n${repairContext ? `\nRepair context from prior failure:\n${repairContext}\n` : ""}\nLoaded context:${loadContext(root, initiativeDir, phaseFile)}\n\nActive phase content:\n${phaseMarkdown}\n`;
}

function runShell(command, root, input = null) {
  const result = spawnSync(command, {
    cwd: root,
    input,
    shell: true,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  return {
    command,
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function summarizeOutput(output, max = 12000) {
  const text =
    `${output.stdout || ""}${output.stderr ? `\nSTDERR:\n${output.stderr}` : ""}`.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[output truncated]`;
}

function runVerification(commands, root) {
  return commands.map((command) => runShell(command, root));
}

function formatCommandResults(results) {
  if (results.length === 0) return "- No verification commands were declared.";
  return results
    .map((result) => {
      const verdict = result.status === 0 ? "pass" : "fail";
      const output = summarizeOutput(result, 4000);
      return `- Command: \`${result.command}\`\n  Result: ${verdict}\n  Exit: ${result.status}\n  Evidence:\n\n\`\`\`text\n${output || "[no output]"}\n\`\`\``;
    })
    .join("\n\n");
}

function verificationSummary(results) {
  if (results.length === 0)
    return "- No verification commands were declared by the phase.";
  const passed = results.filter((result) => result.status === 0).length;
  const failed = results.length - passed;
  return `- Commands run: ${results.length}\n- Passed: ${passed}\n- Failed: ${failed}`;
}

function failureExcerpts(results) {
  const failed = results.filter((result) => result.status !== 0);
  if (failed.length === 0) return "- No verification failures.";
  return failed
    .map(
      (result) =>
        `- Command: \`${result.command}\`\n\n\`\`\`text\n${summarizeOutput(result, 2000) || "[no output]"}\n\`\`\``,
    )
    .join("\n\n");
}

function changedFiles(root) {
  const result = runShell("git diff --name-only", root);
  if (result.status !== 0) return "- Unable to inspect git diff.";
  const files = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (files.length === 0) return "- No git-tracked file changes detected.";
  return files.map((file) => `- \`${file}\``).join("\n");
}

function reportPathFor(initiativeDir, phaseFile) {
  const base = path.basename(phaseFile, ".md");
  return path.join(initiativeDir, "reports", `${base}.md`);
}

function upsertStateSection(root, relativePath, heading, body) {
  const file = path.join(root, relativePath);
  const prior = existsSync(file)
    ? readText(file).trimEnd()
    : `# ${path.basename(file, ".md")}\n`;
  const section = `## ${heading}\n\n${body}`;
  const escapedHeading = heading.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = new RegExp(
    `^## ${escapedHeading}\\n\\n[\\s\\S]*?(?=^## |\\z)`,
    "m",
  );
  const next = existing.test(prior)
    ? prior.replace(existing, section)
    : `${prior}\n\n${section}`;
  writeText(file, `${next.trimEnd()}\n`);
}

function writePhaseReport(
  root,
  initiativeDir,
  phaseFile,
  status,
  agentResult,
  verificationResults,
  repairs,
) {
  const phaseTitle = titleOf(readText(phaseFile), path.basename(phaseFile));
  const report = `# Execution Report: ${phaseTitle}

## Status

\`${status}\`

## Summary

Runner executed the active phase through the configured agent command and recorded verification results.

## Agent Command

${agentResult ? `- Command: \`${agentResult.command}\`\n- Exit: ${agentResult.status}\n\n\`\`\`text\n${summarizeOutput(agentResult, 8000) || "[no output]"}\n\`\`\`` : "- Not run. Dry-run mode was used."}

## Verification Results

### Verification Summary

${verificationSummary(verificationResults)}

### Exact Commands Run

${formatCommandResults(verificationResults)}

### Exact Failure Excerpts

${failureExcerpts(verificationResults)}

### Skipped Commands

- No commands were skipped by the runner. If an agent skipped a phase-declared command, the agent-authored report must record the command and reason.

## Files Changed

${changedFiles(root)}

## Application Code Scope Confirmation

- Runner reports changed files from git diff. The executor must explicitly classify any backend, frontend, shared contract, migration, or mobile changes against the active phase scope.

## Unrelated Drift Classification

- Not automatically classified by runner. Agent-authored reports must classify unrelated dirty worktree or verification drift explicitly.

## Repairs Attempted

${repairs.length === 0 ? "- None." : repairs.map((repair) => `- Attempt ${repair.attempt}: ${repair.summary}`).join("\n")}

## State Updates

- \`.ai/state/current-state.md\`: updated by runner.
- \`.ai/state/known-risks.md\`: updated by runner when issues remain.
- \`.ai/state/verification-status.md\`: updated by runner.
- \`.ai/state/decisions.md\`: not automatically updated by runner.

## Risks And Limitations

${status === "passed" ? "- resolved: No runner-detected residual issues." : "- active: Review command output and phase changes before continuing."}

## Next Phase Readiness

${status === "passed" || status === "passed_with_issues" ? "Next pending phase may start." : "Do not start the next phase until this status is resolved."}
`;
  writeText(reportPathFor(initiativeDir, phaseFile), report);
}

function updatePhaseState(root, phaseFile, status) {
  writeText(phaseFile, setStatus(readText(phaseFile), status));
  const rel = path.relative(root, phaseFile);
  upsertStateSection(
    root,
    ".ai/state/current-state.md",
    `Phase Update: ${rel}`,
    `Phase status is now \`${status}\`.`,
  );
}

function updateVerificationState(root, phaseFile, results) {
  const rel = path.relative(root, phaseFile);
  upsertStateSection(
    root,
    ".ai/state/verification-status.md",
    `Verification: ${rel}`,
    formatCommandResults(results),
  );
}

function updateRiskState(root, phaseFile, status, results) {
  if (status === "passed") return;
  const failed = results
    .filter((result) => result.status !== 0)
    .map((result) => `\`${result.command}\``)
    .join(", ");
  const rel = path.relative(root, phaseFile);
  upsertStateSection(
    root,
    ".ai/state/known-risks.md",
    `Risk: ${rel}`,
    `- active: Status \`${status}\`. Failed commands: ${failed || "none recorded"}.`,
  );
}

function createFinalReport(root, initiativeDir, phases) {
  const statuses = phases.map((file) => ({
    file,
    status: statusOf(readText(file)),
  }));
  const hasFailed = statuses.some(
    (item) => item.status === "failed" || item.status === "blocked",
  );
  const hasIssues = statuses.some(
    (item) => item.status === "passed_with_issues",
  );
  const verdict = hasFailed ? "FAIL" : hasIssues ? "PASS WITH ISSUES" : "PASS";
  const report = `# Final Initiative Report

## Initiative Summary

Initiative execution reached a terminal state for all phase files.

## Completed Phases

${statuses.map((item) => `- \`${path.relative(root, item.file)}\`: ${item.status}`).join("\n")}

## Verification Results

See individual phase reports in \`${path.relative(root, path.join(initiativeDir, "reports"))}\`.

## Files Changed

${changedFiles(root)}

## Risks

See \`.ai/state/known-risks.md\`.

## Known Limitations

This V1 report is generated by the local runner from phase statuses and reports. It does not replace human review.

## Recommended Follow-Up Work

- Review git diff.
- Review phase reports.
- Run broader preflight checks before merge.

## Final Verdict

${verdict}
`;
  writeText(path.join(initiativeDir, "reports", "final-report.md"), report);
}

function nextPhase(phaseFiles) {
  return phaseFiles.find((file) => statusOf(readText(file)) === "pending");
}

function allTerminal(phaseFiles) {
  return phaseFiles.every((file) =>
    ["passed", "passed_with_issues", "blocked", "failed"].includes(
      statusOf(readText(file)),
    ),
  );
}

function validateRequiredFiles(root, initiativeDir) {
  const required = [
    "00-overview.md",
    "01-domain-model.md",
    "02-module-sequence.md",
    "03-cross-module-data-flow.md",
    "04-verification-plan.md",
  ];
  for (const name of required) {
    const file = path.join(initiativeDir, name);
    if (!existsSync(file))
      throw new Error(
        `Required initiative file missing: ${path.relative(root, file)}`,
      );
  }
}

function validateReportsDir(root, initiativeDir) {
  const reportsDir = path.join(initiativeDir, "reports");
  if (!existsSync(reportsDir))
    throw new Error(
      `Initiative reports directory missing: ${path.relative(root, reportsDir)}`,
    );
  if (!statSync(reportsDir).isDirectory())
    throw new Error(
      `Initiative reports path is not a directory: ${path.relative(root, reportsDir)}`,
    );
}

function validateLockReadiness(root, initiativeDir) {
  const overview = readText(path.join(initiativeDir, "00-overview.md"));
  const meta = initiativeMeta(overview);
  if (meta.status !== "locked") {
    throw new Error(
      `Initiative must be locked before execution. Found status: ${meta.status || "[missing]"}`,
    );
  }
  if (meta.ready !== "yes") {
    throw new Error(
      `Initiative must be ready for execution before execution. Found ready: ${meta.ready || "[missing]"}`,
    );
  }
}

function validatePhaseSequence(root, phaseFiles) {
  if (phaseFiles.length === 0) throw new Error("No phase files found.");
  const numbers = phaseFiles.map((file) => phaseNumberOf(file));
  for (let index = 1; index < numbers.length; index += 1) {
    if (numbers[index] <= numbers[index - 1]) {
      throw new Error(
        `Phase files are not in ascending numeric order near phase ${numbers[index]}.`,
      );
    }
  }
  for (const file of phaseFiles) statusOf(readText(file));
  const firstPendingIndex = phaseFiles.findIndex(
    (file) => statusOf(readText(file)) === "pending",
  );
  if (firstPendingIndex > -1) {
    for (const file of phaseFiles.slice(firstPendingIndex + 1)) {
      const status = statusOf(readText(file));
      if (
        ["passed", "passed_with_issues", "blocked", "failed"].includes(status)
      ) {
        throw new Error(
          `Later terminal phase appears after pending phase: ${path.relative(root, file)} (${status})`,
        );
      }
    }
  }
}

function validateDependencies(root, initiativeDir, visiting = new Set()) {
  const overview = readText(path.join(initiativeDir, "00-overview.md"));
  const deps = dependencyKeys(overview);
  const initiativeKey = path.basename(initiativeDir);
  if (visiting.has(initiativeKey))
    throw new Error(
      `Dependency cycle detected at initiative: ${initiativeKey}`,
    );
  visiting.add(initiativeKey);
  for (const dep of deps) {
    const depDir = path.join(root, ".ai/initiatives", dep);
    if (!existsSync(depDir))
      throw new Error(`Dependency initiative not found: ${dep}`);
    validateRequiredFiles(root, depDir);
    const depPhasesDir = path.join(depDir, "phases");
    if (!existsSync(depPhasesDir))
      throw new Error(`Dependency has no phases directory: ${dep}`);
    const depPhases = listPhaseFiles(depPhasesDir);
    validatePhaseSequence(root, depPhases);
    if (!allTerminal(depPhases))
      throw new Error(`Dependency is not complete: ${dep}`);
    const failed = depPhases.find((file) =>
      ["blocked", "failed"].includes(statusOf(readText(file))),
    );
    if (failed)
      throw new Error(
        `Dependency is blocked or failed: ${dep} (${path.basename(failed)})`,
      );
    if (!existsSync(path.join(depDir, "reports", "final-report.md"))) {
      throw new Error(`Dependency final report missing: ${dep}`);
    }
    validateDependencies(root, depDir, new Set(visiting));
  }
  visiting.delete(initiativeKey);
}

function preflight(root, initiativeKey) {
  const initiativeDir = path.join(root, ".ai/initiatives", initiativeKey);
  const phasesDir = path.join(initiativeDir, "phases");
  if (!existsSync(initiativeDir))
    throw new Error(
      `Initiative not found: ${path.relative(root, initiativeDir)}`,
    );
  if (!existsSync(phasesDir))
    throw new Error(
      `Initiative has no phases directory: ${path.relative(root, phasesDir)}`,
    );
  validateRequiredFiles(root, initiativeDir);
  validateReportsDir(root, initiativeDir);
  validateLockReadiness(root, initiativeDir);
  const phaseFiles = listPhaseFiles(phasesDir);
  validatePhaseSequence(root, phaseFiles);
  validateDependencies(root, initiativeDir);
  return { initiativeDir, phasesDir, phaseFiles };
}

function executePhase(root, initiativeKey, initiativeDir, phaseFile, options) {
  const commands = extractVerificationCommands(readText(phaseFile));
  const agentCommand =
    options.agentCommand ??
    `codex exec --cd ${JSON.stringify(root)} --sandbox danger-full-access -`;
  const prompt = buildPrompt(root, initiativeKey, initiativeDir, phaseFile);
  const promptFile = path.join(
    initiativeDir,
    "reports",
    `${path.basename(phaseFile, ".md")}-prompt.md`,
  );
  writeText(promptFile, prompt);

  if (options.dryRun) {
    console.log(`Dry run prompt written: ${path.relative(root, promptFile)}`);
    return "dry_run";
  }

  updatePhaseState(root, phaseFile, "in_progress");
  let agentResult = runShell(agentCommand, root, prompt);
  let verificationResults = runVerification(commands, root);
  const repairs = [];

  for (
    let attempt = 1;
    verificationResults.some((result) => result.status !== 0) &&
    attempt <= options.maxRetries;
    attempt += 1
  ) {
    updatePhaseState(root, phaseFile, "repairing");
    const repairContext = formatCommandResults(verificationResults);
    const repairPrompt = buildPrompt(
      root,
      initiativeKey,
      initiativeDir,
      phaseFile,
      `Repair attempt ${attempt} of ${options.maxRetries}.\n${repairContext}`,
    );
    agentResult = runShell(agentCommand, root, repairPrompt);
    verificationResults = runVerification(commands, root);
    repairs.push({
      attempt,
      summary: verificationResults.every((result) => result.status === 0)
        ? "verification passed after repair"
        : "verification still failing",
    });
  }

  const finalStatus = verificationResults.some((result) => result.status !== 0)
    ? "failed"
    : "passed";
  updatePhaseState(root, phaseFile, finalStatus);
  updateVerificationState(root, phaseFile, verificationResults);
  updateRiskState(root, phaseFile, finalStatus, verificationResults);
  writePhaseReport(
    root,
    initiativeDir,
    phaseFile,
    finalStatus,
    agentResult,
    verificationResults,
    repairs,
  );
  return finalStatus;
}

function main() {
  const { help, initiative, options } = parseArgs(process.argv.slice(2));
  if (help) {
    console.log(HELP);
    return;
  }

  const root = repoRoot();
  const { initiativeDir, phaseFiles } = preflight(root, initiative);
  if (options.checkOnly) {
    console.log(`Preflight passed for ${initiative}.`);
    return;
  }

  while (true) {
    const phaseFile = nextPhase(phaseFiles);
    if (!phaseFile) {
      if (allTerminal(phaseFiles))
        createFinalReport(root, initiativeDir, phaseFiles);
      console.log(`No pending phases for ${initiative}.`);
      return;
    }

    console.log(
      `Executing ${path.relative(root, phaseFile)} (${statusOf(readText(phaseFile))})`,
    );
    const result = executePhase(
      root,
      initiative,
      initiativeDir,
      phaseFile,
      options,
    );
    if (
      result === "dry_run" ||
      options.once ||
      result === "failed" ||
      result === "blocked"
    )
      return;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
