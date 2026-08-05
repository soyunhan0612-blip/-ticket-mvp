#!/usr/bin/env node
"use strict";

const {
  blockedDangerousPattern,
  commandText,
  deny,
  emit,
  readPayload,
} = require("./hook-utils.cjs");

readPayload((payload) => {
  const command = commandText(payload.tool_input);
  const blocked = blockedDangerousPattern(command);
  emit(blocked ? deny(`위험한 명령어가 감지되어 차단했습니다: ${blocked}`) : {});
});

