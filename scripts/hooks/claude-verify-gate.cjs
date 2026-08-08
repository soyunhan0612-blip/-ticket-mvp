#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { nodeEnvironmentForProject, readPayload } = require("./hook-utils.cjs");

const ROOT = process.env.HOOK_PROJECT_ROOT
  ? path.resolve(process.env.HOOK_PROJECT_ROOT)
  : path.resolve(__dirname, "..", "..");

function runNpm(script, env) {
  const executable = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawnSync(executable, ["run", script], {
    cwd: ROOT,
    encoding: "utf8",
    env,
    timeout: 150_000,
  });
}

readPayload((payload) => {
  if (payload.stop_hook_active || !fs.existsSync(path.join(ROOT, "package.json"))) return;

  const runtime = nodeEnvironmentForProject(ROOT);
  if (runtime.error) {
    process.stderr.write(`${runtime.error}\n`);
    process.exitCode = 1;
    return;
  }

  const failures = [];
  for (const script of ["lint", "test"]) {
    const result = runNpm(script, runtime.env);
    if (result.status !== 0) {
      const output = `${result.stdout || ""}\n${result.stderr || result.error || ""}`.trim();
      failures.push(`npm run ${script} 실패:\n${output.slice(-3000)}`);
    }
  }

  if (failures.length > 0) {
    process.stderr.write(`${failures.join("\n\n")}\n`);
    process.exitCode = 1;
  }
});
