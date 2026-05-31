#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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
  --dry-run                 Build the next phase prompt without invoking Codex.
  --once                    Execute only one phase.
  --max-retries <n>         Repair attempts per phase. Default: 3.
  --agent-command <command> Command used to execute a prompt. Default: codex exec --cd <repo> --sandbox danger-full-access -
  --help                    Show this help.

Examples:
  pnpm ai:run my-initiative -- --dry-run
  pnpm ai:run my-initiative -- --once --max-retries 2
`;

function parseArgs(argv) {
  const args = argv.filter((arg) => arg !== "--");
  const options = {
    dryRun: false,
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
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--once") options.once = true;
    else if (arg === "--max-retries") {
      const value = Number(args[++i]);
      if (!Number.isInteger(value) || value < 0) throw new Error("--max-retries must be a non-negative integer");
      options.maxRetries = value;
    } else if (arg === "--agent-command") {
      options.agentCommand = args[++i];
      if (!options.agentCommand) throw new Error("--agent-command requires a value");
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return { help: false, initiative, options };
}

function repoRoot() {
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

function statusOf(markdown) {
  const match = markdown.match(/^Status:\s*([a-z_]+)\s*$/im);
  if (!match) return "pending";
  const status = match[1];
  if (!STATUSES.has(status)) throw new Error(`Unknown phase status: ${status}`);
  return status;
}

function setStatus(markdown, status) {
  if (!STATUSES.has(status)) throw new Error(`Invalid status: ${status}`);
  if (/^Status:\s*[a-z_]+\s*$/im.test(markdown)) {
    return markdown.replace(/^Status:\s*[a-z_]+\s*$/im, `Status: ${status}`);
  }
  return markdown.replace(/^# .+$/m, (title) => `${title}\n\nStatus: ${status}`);
}

function titleOf(markdown, fallback) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

function extractVerificationCommands(markdown) {
  const section = markdown.match(/^## Verification Commands\s*$([\s\S]*?)(?=^## |\z)/im)?.[1] ?? "";
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
    ...listMarkdownFiles(initiativeDir).filter((file) => !file.includes(`${path.sep}reports${path.sep}`)),
    phaseFile,
  ];

  return files
    .filter((file, index, all) => existsSync(file) && all.indexOf(file) === index)
    .map((file) => `\n\n---\nFILE: ${path.relative(root, file)}\n---\n${readText(file)}`)
    .join("");
}

function buildPrompt(root, initiativeKey, initiativeDir, phaseFile, repairContext = "") {
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
  const text = `${output.stdout || ""}${output.stderr ? `\nSTDERR:\n${output.stderr}` : ""}`.trim();
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

function reportPathFor(initiativeDir, phaseFile) {
  const base = path.basename(phaseFile, ".md");
  return path.join(initiativeDir, "reports", `${base}-report.md`);
}

function appendState(root, relativePath, heading, body) {
  const file = path.join(root, relativePath);
  const prior = existsSync(file) ? readText(file).trimEnd() : `# ${path.basename(file, ".md")}\n`;
  writeText(file, `${prior}\n\n## ${heading}\n\n${body}\n`);
}

function writePhaseReport(root, initiativeDir, phaseFile, status, agentResult, verificationResults, repairs) {
  const phaseTitle = titleOf(readText(phaseFile), path.basename(phaseFile));
  const report = `# Execution Report: ${phaseTitle}

## Status

\`${status}\`

## Summary

Runner executed the active phase through the configured agent command and recorded verification results.

## Agent Command

${agentResult ? `- Command: \`${agentResult.command}\`\n- Exit: ${agentResult.status}\n\n\`\`\`text\n${summarizeOutput(agentResult, 8000) || "[no output]"}\n\`\`\`` : "- Not run. Dry-run mode was used."}

## Verification Results

${formatCommandResults(verificationResults)}

## Repairs Attempted

${repairs.length === 0 ? "- None." : repairs.map((repair) => `- Attempt ${repair.attempt}: ${repair.summary}`).join("\n")}

## State Updates

- \`.ai/state/current-state.md\`: updated by runner.
- \`.ai/state/known-risks.md\`: updated by runner when issues remain.
- \`.ai/state/verification-status.md\`: updated by runner.
- \`.ai/state/decisions.md\`: not automatically updated by runner.

## Risks And Limitations

${status === "passed" ? "No runner-detected residual issues." : "Review command output and phase changes before continuing."}

## Next Phase Readiness

${status === "passed" || status === "passed_with_issues" ? "Next pending phase may start." : "Do not start the next phase until this status is resolved."}
`;
  writeText(reportPathFor(initiativeDir, phaseFile), report);
}

function updatePhaseState(root, phaseFile, status) {
  writeText(phaseFile, setStatus(readText(phaseFile), status));
  const rel = path.relative(root, phaseFile);
  appendState(root, ".ai/state/current-state.md", `Phase Update: ${rel}`, `Phase status is now \`${status}\`.`);
}

function updateVerificationState(root, phaseFile, results) {
  const rel = path.relative(root, phaseFile);
  appendState(root, ".ai/state/verification-status.md", `Verification: ${rel}`, formatCommandResults(results));
}

function updateRiskState(root, phaseFile, status, results) {
  if (status === "passed") return;
  const failed = results.filter((result) => result.status !== 0).map((result) => `\`${result.command}\``).join(", ");
  const rel = path.relative(root, phaseFile);
  appendState(root, ".ai/state/known-risks.md", `Risk: ${rel}`, `Status \`${status}\`. Failed commands: ${failed || "none recorded"}.`);
}

function createFinalReport(root, initiativeDir, phases) {
  const statuses = phases.map((file) => ({ file, status: statusOf(readText(file)) }));
  const hasFailed = statuses.some((item) => item.status === "failed" || item.status === "blocked");
  const hasIssues = statuses.some((item) => item.status === "passed_with_issues");
  const verdict = hasFailed ? "FAIL" : hasIssues ? "PASS WITH ISSUES" : "PASS";
  const report = `# Final Initiative Report

## Initiative Summary

Initiative execution reached a terminal state for all phase files.

## Completed Phases

${statuses.map((item) => `- \`${path.relative(root, item.file)}\`: ${item.status}`).join("\n")}

## Verification Results

See individual phase reports in \`${path.relative(root, path.join(initiativeDir, "reports"))}\`.

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
  return phaseFiles.every((file) => ["passed", "passed_with_issues", "blocked", "failed"].includes(statusOf(readText(file))));
}

function executePhase(root, initiativeKey, initiativeDir, phaseFile, options) {
  const commands = extractVerificationCommands(readText(phaseFile));
  const agentCommand = options.agentCommand ?? `codex exec --cd ${JSON.stringify(root)} --sandbox danger-full-access -`;
  const prompt = buildPrompt(root, initiativeKey, initiativeDir, phaseFile);
  const promptFile = path.join(initiativeDir, "reports", `${path.basename(phaseFile, ".md")}-prompt.md`);
  writeText(promptFile, prompt);

  if (options.dryRun) {
    console.log(`Dry run prompt written: ${path.relative(root, promptFile)}`);
    return "dry_run";
  }

  updatePhaseState(root, phaseFile, "in_progress");
  let agentResult = runShell(agentCommand, root, prompt);
  let verificationResults = runVerification(commands, root);
  const repairs = [];

  for (let attempt = 1; verificationResults.some((result) => result.status !== 0) && attempt <= options.maxRetries; attempt += 1) {
    updatePhaseState(root, phaseFile, "repairing");
    const repairContext = formatCommandResults(verificationResults);
    const repairPrompt = buildPrompt(root, initiativeKey, initiativeDir, phaseFile, `Repair attempt ${attempt} of ${options.maxRetries}.\n${repairContext}`);
    agentResult = runShell(agentCommand, root, repairPrompt);
    verificationResults = runVerification(commands, root);
    repairs.push({ attempt, summary: verificationResults.every((result) => result.status === 0) ? "verification passed after repair" : "verification still failing" });
  }

  const finalStatus = verificationResults.some((result) => result.status !== 0) ? "failed" : "passed";
  updatePhaseState(root, phaseFile, finalStatus);
  updateVerificationState(root, phaseFile, verificationResults);
  updateRiskState(root, phaseFile, finalStatus, verificationResults);
  writePhaseReport(root, initiativeDir, phaseFile, finalStatus, agentResult, verificationResults, repairs);
  return finalStatus;
}

function main() {
  const { help, initiative, options } = parseArgs(process.argv.slice(2));
  if (help) {
    console.log(HELP);
    return;
  }

  const root = repoRoot();
  const initiativeDir = path.join(root, ".ai/initiatives", initiative);
  const phasesDir = path.join(initiativeDir, "phases");

  if (!existsSync(initiativeDir)) throw new Error(`Initiative not found: ${path.relative(root, initiativeDir)}`);
  if (!existsSync(phasesDir)) throw new Error(`Initiative has no phases directory: ${path.relative(root, phasesDir)}`);

  mkdirSync(path.join(initiativeDir, "reports"), { recursive: true });
  const phaseFiles = listMarkdownFiles(phasesDir);
  if (phaseFiles.length === 0) throw new Error(`No phase files found in ${path.relative(root, phasesDir)}`);

  while (true) {
    const phaseFile = nextPhase(phaseFiles);
    if (!phaseFile) {
      if (allTerminal(phaseFiles)) createFinalReport(root, initiativeDir, phaseFiles);
      console.log(`No pending phases for ${initiative}.`);
      return;
    }

    console.log(`Executing ${path.relative(root, phaseFile)} (${statusOf(readText(phaseFile))})`);
    const result = executePhase(root, initiative, initiativeDir, phaseFile, options);
    if (result === "dry_run" || options.once || result === "failed" || result === "blocked") return;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
