import assert from "node:assert/strict";

import { describeEdit, describeWrite } from "../extensions/mutation-summary.ts";

// Verbatim from a live Claude Code v2.1.207 capture — see
// docs/plans/2026-07-13-current-cc-grammar.md.
assert.equal(describeWrite(1, "../../../../tmp/ccprobe.txt"), "Wrote 1 line to ../../../../tmp/ccprobe.txt");
assert.equal(describeEdit(1, 1), "Added 1 line, removed 1 line");

assert.equal(describeWrite(27, "config/config.example.json"), "Wrote 27 lines to config/config.example.json");
assert.equal(describeEdit(4, 0), "Added 4 lines");
assert.equal(describeEdit(0, 3), "Removed 3 lines");
assert.equal(describeEdit(0, 1), "Removed 1 line");
assert.equal(describeEdit(0, 0), "No changes");

console.log("mutation summary tests passed");
