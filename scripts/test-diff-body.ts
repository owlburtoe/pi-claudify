import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { initTheme } from "../node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js";

// Isolate ambient config. At module-eval time extensions/index.ts seeds its shiki
// theme from $DIFF_THEME and reads its diff palette from $CWD/.pi/settings.json,
// falling back to $HOME/.pi/settings.json. The palette asserted below is the
// default (Monokai) one, so a developer with either of those set renders other
// token colors and the syntax-highlighting assertions go red. Pin both, then
// import — a static import would be hoisted above these lines.
const sandbox = mkdtempSync(join(tmpdir(), "cc-diff-"));
process.env.HOME = sandbox;
process.chdir(sandbox);
process.env.DIFF_THEME = "monokai";

const { parseDiff, renderFileListing, renderUnified } = await import("../extensions/index.ts");

// Target grammar + palette captured from the raw Claude Code TTY stream:
// docs/plans/2026-07-13-current-cc-grammar.md
const CC_BG_DEL = "\x1b[48;2;61;1;0m";
const CC_BG_ADD = "\x1b[48;2;2;40;0m";
const CC_BG_DEL_WORD = "\x1b[48;2;92;2;0m";
const CC_BG_ADD_WORD = "\x1b[48;2;4;71;0m";
const CC_FG_DEL = "\x1b[38;2;220;90;90m";
const CC_FG_ADD = "\x1b[38;2;80;200;80m";

const strip = (text: string): string => text.replace(/\x1b\[[0-9;]*m/g, "");

initTheme("dark", false);

const old = "const a = 1;\nconst b = 2;\nconst c = 3;\n";
const next = "const a = 1;\nconst b = 20;\nconst c = 30;\n";

const raw = await renderUnified(parseDiff(old, next), "typescript", 50, undefined, 80);
const plain = strip(raw);

// No box chrome: Claude Code has no ▌ bar, no │ divider, and no ─── rules.
assert.doesNotMatch(plain, /▌/);
assert.doesNotMatch(plain, /│/);
assert.doesNotMatch(plain, /─/);

// Unified hunk: removals carry old line numbers, additions carry new ones, and all
// removals precede all additions.
//   1  const a = 1;
//   2 -const b = 2;
//   3 -const c = 3;
//   2 +const b = 20;
//   3 +const c = 30;
assert.match(plain, /^ 1 {2}const a = 1;/m);
assert.match(plain, /^ 2 -const b = 2;/m);
assert.match(plain, /^ 3 -const c = 3;/m);
assert.match(plain, /^ 2 \+const b = 20;/m);
assert.match(plain, /^ 3 \+const c = 30;/m);

const lines = plain.split("\n").filter((line) => /^ \d+ [-+]/.test(line));
const firstAdd = lines.findIndex((line) => / \+/.test(line));
const lastDel = lines.map((line) => / -/.test(line)).lastIndexOf(true);
assert.ok(lastDel < firstAdd, "all removals must precede all additions");

// Exact palette, including the brighter background on the changed token.
assert.ok(raw.includes(CC_BG_DEL), "removed line background");
assert.ok(raw.includes(CC_BG_ADD), "added line background");
assert.ok(raw.includes(CC_FG_DEL), "removed gutter foreground");
assert.ok(raw.includes(CC_FG_ADD), "added gutter foreground");
assert.ok(raw.includes(CC_BG_DEL_WORD), "removed changed-token background");
assert.ok(raw.includes(CC_BG_ADD_WORD), "added changed-token background");

// Removed lines are NOT syntax-highlighted — their content is plain foreground,
// while added lines keep their Monokai tokens.
const delLine = raw.split("\n").find((line) => strip(line).startsWith(" 2 -")) ?? "";
const addLine = raw.split("\n").find((line) => strip(line).startsWith(" 2 +")) ?? "";
const MONOKAI_KEYWORD = "\x1b[38;2;102;217;239m";
assert.ok(!delLine.includes(MONOKAI_KEYWORD), "removed line must not be syntax-highlighted");
assert.ok(addLine.includes(MONOKAI_KEYWORD), "added line must keep syntax highlighting");

// A write renders as a plain numbered listing: no sign column, no green background.
const listing = await renderFileListing("const a = 1;\nconst b = 2;\n", "typescript", 50, 80);
const listingPlain = strip(listing);
assert.match(listingPlain, /^ 1 const a = 1;/m);
assert.match(listingPlain, /^ 2 const b = 2;/m);
assert.doesNotMatch(listingPlain, /^\s*\d+ \+/m);
assert.ok(!listing.includes(CC_BG_ADD), "write listing must not paint an added-line background");

console.log("diff body tests passed");
