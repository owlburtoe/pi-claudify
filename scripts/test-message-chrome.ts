import assert from "node:assert/strict";

import { formatTranscriptLines, resolveMessageChromeSettings } from "../extensions/message-chrome.ts";

const comfortable = formatTranscriptLines([
	"",
	"Pushed b0e53030. Let me verify the macOS check no longer sits pending on the new commit:",
	"continued wrap",
	"",
	"",
	"Still pending — but that may be transitional.",
	"",
], {
	prefix: "●",
	spacing: "comfortable",
});

assert.deepEqual(comfortable, [
	" ● Pushed b0e53030. Let me verify the macOS check no longer sits pending on the new commit:",
	"   continued wrap",
	"   ",
	"   Still pending — but that may be transitional.",
]);

const compact = formatTranscriptLines(["First", "", "", "Second"], {
	prefix: "✻",
	spacing: "compact",
});

assert.deepEqual(compact, [
	" ✻ First",
	"   Second",
]);

assert.deepEqual(resolveMessageChromeSettings({
	messageStyle: "classic",
	assistantPrefix: "",
	thinkingPrefix: "thinking\u001b[31m",
	messageSpacing: "wide",
	workingTipText: "  Use /cc-message ",
}), {
	messageStyle: "classic",
	assistantPrefix: "●",
	thinkingPrefix: "thinking",
	messageSpacing: "comfortable",
	workingTipEnabled: false,
	workingTipText: "Use /cc-message",
	hiddenThinkingLabel: "Pondering...",
});

assert.equal(resolveMessageChromeSettings({ messageStyle: "classic", workingTipEnabled: true }).workingTipEnabled, true);

assert.deepEqual(formatTranscriptLines(["Alpha", "Beta"], {
	prefix: "🚀",
	spacing: "comfortable",
	visibleWidth: (text) => text.includes("🚀") ? 4 : Array.from(text).length,
}), [
	" 🚀 Alpha",
	"    Beta",
]);

console.log("message chrome tests passed");
