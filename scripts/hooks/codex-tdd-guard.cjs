#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  commandText,
  deny,
  editedPaths,
  emit,
  normalizePath,
  readPayload,
  requiresTest,
  testCandidates,
} = require("./hook-utils.cjs");

const ROOT = process.env.HOOK_PROJECT_ROOT
  ? path.resolve(process.env.HOOK_PROJECT_ROOT)
  : path.resolve(__dirname, "..", "..");

readPayload((payload) => {
  if (!fs.existsSync(path.join(ROOT, "package.json"))) {
    emit({});
    return;
  }

  const toolInput = payload.tool_input || {};
  const directPath = typeof toolInput.file_path === "string"
    ? [normalizePath(toolInput.file_path, ROOT)]
    : [];
  const patchPaths = editedPaths(commandText(toolInput), ROOT);
  const paths = [...new Set([...directPath, ...patchPaths])];
  const pathsInPatch = new Set(patchPaths);
  const missing = paths.filter((filePath) => {
    if (!requiresTest(filePath)) return false;
    return !testCandidates(filePath, ROOT).some((candidate) =>
      fs.existsSync(candidate) || pathsInPatch.has(normalizePath(candidate, ROOT)));
  });

  emit(missing.length > 0
    ? deny(`TDD GUARD: 구현보다 테스트를 먼저 추가하세요. 테스트가 없는 파일: ${missing.join(", ")}`)
    : {});
});
