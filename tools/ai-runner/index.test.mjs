import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const runner = path.resolve("tools/ai-runner/index.mjs");

function tempRepo() {
  const root = mkdtempSync(path.join(tmpdir(), "fph-ai-runner-"));
  mkdirSync(path.join(root, ".ai/initiatives"), { recursive: true });
  mkdirSync(path.join(root, ".ai/core"), { recursive: true });
  mkdirSync(path.join(root, ".ai/state"), { recursive: true });
  writeFileSync(path.join(root, "AGENTS.md"), "# Agents\n");
  writeFileSync(path.join(root, ".ai/README.md"), "# AI\n");
  for (const name of [
    "current-state",
    "known-risks",
    "verification-status",
    "decisions",
  ]) {
    writeFileSync(path.join(root, `.ai/state/${name}.md`), `# ${name}\n`);
  }
  return root;
}

function writeInitiative(root, key, options = {}) {
  const dir = path.join(root, ".ai/initiatives", key);
  mkdirSync(path.join(dir, "phases"), { recursive: true });
  if (options.reports !== false)
    mkdirSync(path.join(dir, "reports"), { recursive: true });
  const status = options.status ?? "locked";
  const ready = options.ready ?? "yes";
  const depends = options.dependsOn
    ? `\ndepends_on: ${options.dependsOn.join(", ")}\n`
    : "";
  writeFileSync(
    path.join(dir, "00-overview.md"),
    `# ${key}\n\n## Initiative Status\n\n- Status: ${status}\n- Ready for execution: ${ready}\n- Execution started: no\n${depends}`,
  );
  for (const file of [
    "01-domain-model.md",
    "02-module-sequence.md",
    "03-cross-module-data-flow.md",
    "04-verification-plan.md",
  ]) {
    writeFileSync(path.join(dir, file), `# ${file}\n`);
  }
  return dir;
}

function writePhase(root, key, number, slug, status = "pending") {
  const file = path.join(
    root,
    ".ai/initiatives",
    key,
    "phases",
    `phase-${number}-${slug}.md`,
  );
  writeFileSync(
    file,
    `# Phase ${number}: ${slug}\n\nStatus: ${status}\n\n## Verification Commands\n\n- \`node --version\`\n`,
  );
  return file;
}

function run(root, args) {
  return spawnSync(process.execPath, [runner, ...args], {
    cwd: path.dirname(path.dirname(runner)),
    env: { ...process.env, FPH_AI_RUNNER_ROOT: root },
    encoding: "utf8",
  });
}

test("check-only validates a minimal locked ready initiative", () => {
  const root = tempRepo();
  try {
    writeInitiative(root, "sample");
    writePhase(root, "sample", 1, "one");
    const result = run(root, ["sample", "--check-only"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Preflight passed for sample/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("numeric phase ordering selects phase 2 before phase 10", () => {
  const root = tempRepo();
  try {
    writeInitiative(root, "sample");
    writePhase(root, "sample", 1, "one", "passed");
    writePhase(root, "sample", 10, "ten");
    writePhase(root, "sample", 2, "two");
    const result = run(root, ["sample", "--dry-run", "--once"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /phase-2-two-prompt\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("invalid and legacy statuses fail preflight", () => {
  for (const status of ["completed", "done", "wat"]) {
    const root = tempRepo();
    try {
      writeInitiative(root, "sample");
      writePhase(root, "sample", 1, "one", status);
      const result = run(root, ["sample", "--check-only"]);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /status/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("initiative lock and readiness are required", () => {
  const root = tempRepo();
  try {
    writeInitiative(root, "sample", { status: "draft", ready: "no" });
    writePhase(root, "sample", 1, "one");
    const result = run(root, ["sample", "--check-only"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /locked/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("missing required files and reports folder fail preflight", () => {
  const root = tempRepo();
  try {
    writeInitiative(root, "sample", { reports: false });
    writePhase(root, "sample", 1, "one");
    const missingReports = run(root, ["sample", "--check-only"]);
    assert.notEqual(missingReports.status, 0);
    assert.match(missingReports.stderr, /reports directory missing/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("dependency readiness is validated", () => {
  const root = tempRepo();
  try {
    writeInitiative(root, "blocked-dep");
    writePhase(root, "blocked-dep", 1, "one", "blocked");
    writeFileSync(
      path.join(root, ".ai/initiatives/blocked-dep/reports/final-report.md"),
      "# Final\n",
    );
    writeInitiative(root, "sample", { dependsOn: ["blocked-dep"] });
    writePhase(root, "sample", 1, "one");
    const blocked = run(root, ["sample", "--check-only"]);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /blocked or failed/);

    writeInitiative(root, "passed-dep");
    writePhase(root, "passed-dep", 1, "one", "passed");
    writeFileSync(
      path.join(root, ".ai/initiatives/passed-dep/reports/final-report.md"),
      "# Final\n",
    );
    writeInitiative(root, "sample-ok", { dependsOn: ["passed-dep"] });
    writePhase(root, "sample-ok", 1, "one");
    const passed = run(root, ["sample-ok", "--check-only"]);
    assert.equal(passed.status, 0, passed.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
