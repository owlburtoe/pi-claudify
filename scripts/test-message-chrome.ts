import assert from "node:assert/strict";

import {
	DEFAULT_USER_PREFIX,
	formatTranscriptLines,
	formatWorkedLine,
	resolveMessageChromeSettings,
} from "../extensions/message-chrome.ts";

// Grammar target: docs/plans/2026-07-13-current-cc-grammar.md
// Claude Code puts the bullet at column 0 and aligns wrapped lines two columns
// in, under the body text. There is no leading space before the glyph.

const comfortable = formatTranscriptLines([
	"",
	"Pushed b0e53030. Let me verify the macOS check no longer sits pending on the new commit:",
	"continued wrap",
	"",
	"",
	"Still pending — but that may be transitional.",
	"",
], {
	prefix: "⏺",
	spacing: "comfortable",
});

assert.deepEqual(comfortable, [
	"⏺ Pushed b0e53030. Let me verify the macOS check no longer sits pending on the new commit:",
	"  continued wrap",
	"  ",
	"  Still pending — but that may be transitional.",
]);

const compact = formatTranscriptLines(["First", "", "", "Second"], {
	prefix: "✻",
	spacing: "compact",
});

assert.deepEqual(compact, [
	"✻ First",
	"  Second",
]);

// User messages reuse the same grammar with ❯ — no box, no leading space.
assert.deepEqual(formatTranscriptLines(["Work on SIM-174.", "second line"], {
	prefix: DEFAULT_USER_PREFIX,
	spacing: "comfortable",
}), [
	"❯ Work on SIM-174.",
	"  second line",
]);

assert.equal(DEFAULT_USER_PREFIX, "❯");

// Assistant default is ⏺ — the same glyph as tool rows, not ●.
assert.deepEqual(resolveMessageChromeSettings({
	messageStyle: "classic",
	assistantPrefix: "",
	thinkingPrefix: "thinking[31m",
	messageSpacing: "wide",
}), {
	messageStyle: "classic",
	assistantPrefix: "⏺",
	thinkingPrefix: "thinking",
	messageSpacing: "comfortable",
	hiddenThinkingLabel: "Pondering...",
});

// Wide glyphs still align: continuation matches the rendered prefix width.
assert.deepEqual(formatTranscriptLines(["Alpha", "Beta"], {
	prefix: "🚀",
	spacing: "comfortable",
	visibleWidth: (text) => text.includes("🚀") ? 3 : Array.from(text).length,
}), [
	"🚀 Alpha",
	"   Beta",
]);

// Worked line: playful past-tense verb + duration, e.g. "✻ Cooked for 8s".
assert.match(formatWorkedLine(8000, { seed: 0 }), /^✻ \S+ for 8s$/);

// Live state appends after a · separator: "✻ Sautéed for 11s · 1 shell still running"
assert.equal(
	formatWorkedLine(11_000, { seed: 0, suffix: "1 shell still running" }),
	`${formatWorkedLine(11_000, { seed: 0 })} · 1 shell still running`,
);

// Duration formatting matches Claude Code: 8s, 1m 25s.
assert.match(formatWorkedLine(85_000, { seed: 1 }), /^✻ \S+ for 1m 25s$/);

// A turn must not re-roll its verb on repaint: same seed, same verb.
assert.equal(formatWorkedLine(8000, { seed: 42 }), formatWorkedLine(8000, { seed: 42 }));

console.log("message chrome tests passed");
