#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { emit, readPayload } = require("./hook-utils.cjs");

const ROOT = process.env.HOOK_PROJECT_ROOT
  ? path.resolve(process.env.HOOK_PROJECT_ROOT)
  : path.resolve(__dirname, "..", "..");

function runNpm(script) {
  const executable = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawnSync(executable, ["run", script], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 150_000,
  });
}

readPayload((payload) => {
  if (payload.stop_hook_active || !fs.existsSync(path.join(ROOT, "package.json"))) {
    emit({ continue: true });
    return;
  }

  const failures = [];
  for (const script of ["lint", "test"]) {
    const result = runNpm(script);
    if (result.status !== 0) {
      const output = `${result.stdout || ""}\n${result.stderr || result.error || ""}`.trim();
      failures.push(`npm run ${script} 실패:\n${output.slice(-3000)}`);
    }
  }

  emit(failures.length === 0
    ? { continue: true }
    : { decision: "block", reason: failures.join("\n\n") });
});
