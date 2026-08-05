"use strict";

const path = require("node:path");

const SOURCE_SUFFIXES = [".ts", ".tsx", ".js", ".jsx"];
const TEST_MARKERS = [".test.", ".spec.", "/__tests__/"];
const DANGEROUS_COMMANDS = [
  /\brm\s+-rf\b/i,
  /\brm\s+-r\b.*-f\b/i,                          // rm -r -f (분리된 플래그)
  // git push --force in any form (including -C <dir> prefix and branch args)
  /\bgit(?:\s+-C\s+\S+)?\s+push\b.*--force(?:-with-lease)?\b/i,
  // git reset --hard in any form (including -C <dir> prefix)
  /\bgit(?:\s+-C\s+\S+)?\s+reset\s+--hard\b/i,
  /\bgit\b.*\bclean\b.*-[a-zA-Z]*f/i,            // git clean -fdx 등
  /\bDROP\s+TABLE\b/i,
  // PowerShell destructive remove (any order of flags)
  /\bRemove-Item\b.*-Recurse\b.*-Force\b/i,
  /\bRemove-Item\b.*-Force\b.*-Recurse\b/i,
  // PowerShell aliases
  /\bri\b.*-Recurse\b.*-Force\b/i,
  /\bri\b.*-Force\b.*-Recurse\b/i,
  // Windows CMD 재귀 삭제
  /\brd\b.*\/s\b.*\/q\b/i,
  /\brmdir\b.*\/s\b.*\/q\b/i,
  /\bdel\b.*\/[fsq]/i,
];

function emit(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function deny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

function normalizePath(filePath, root) {
  const normalizedRoot = path.resolve(root).replaceAll("\\", "/");
  let normalized = String(filePath || "").replaceAll("\\", "/");
  if (normalized.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}/`)) {
    normalized = normalized.slice(normalizedRoot.length + 1);
  }
  return normalized.replace(/^\.\//, "");
}

function commandText(toolInput = {}) {
  const command = toolInput.command ?? toolInput.cmd ?? "";
  return Array.isArray(command) ? command.join(" ") : String(command);
}

function blockedDangerousPattern(command) {
  return DANGEROUS_COMMANDS.find((pattern) => pattern.test(command));
}

function editedPaths(command, root) {
  return [...command.matchAll(/^\*\*\* (?:Add|Update|Delete) File:\s*(.+?)\s*$/gm)]
    .map((match) => normalizePath(match[1].trim(), root));
}

function requiresTest(filePath) {
  const lowered = filePath.toLowerCase();
  if (!SOURCE_SUFFIXES.some((suffix) => lowered.endsWith(suffix))) return false;
  if (TEST_MARKERS.some((marker) => lowered.includes(marker))) return false;
  if (lowered.startsWith("src/lib/") || lowered.startsWith("src/services/")) return true;
  return /^src\/app\/api\/.+\/route\.(?:ts|tsx|js|jsx)$/.test(lowered);
}

function testCandidates(filePath, root) {
  const source = path.join(root, filePath);
  const directory = path.dirname(source);
  const extension = path.extname(source);
  const stem = path.basename(source, extension);
  return SOURCE_SUFFIXES.flatMap((suffix) => [
    path.join(directory, `${stem}.test${suffix}`),
    path.join(directory, `${stem}.spec${suffix}`),
    path.join(directory, "__tests__", `${stem}.test${suffix}`),
    path.join(directory, "__tests__", `${stem}.spec${suffix}`),
  ]);
}

function readPayload(callback) {
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { input += chunk; });
  process.stdin.on("end", () => {
    try {
      callback(JSON.parse(input || "{}"));
    } catch (error) {
      emit(deny(`Hook 입력 파싱 실패: ${error.message}`));
    }
  });
}

module.exports = {
  blockedDangerousPattern,
  commandText,
  deny,
  editedPaths,
  emit,
  normalizePath,
  readPayload,
  requiresTest,
  testCandidates,
};

