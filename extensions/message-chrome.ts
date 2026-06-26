export type MessageStyle = "classic" | "claude";
export type MessageSpacing = "compact" | "comfortable";

export interface MessageChromeInput {
	messageStyle?: unknown;
	assistantPrefix?: unknown;
	thinkingPrefix?: unknown;
	messageSpacing?: unknown;
	hiddenThinkingLabel?: unknown;
}

export interface MessageChromeSettings {
	messageStyle: MessageStyle;
	assistantPrefix: string;
	thinkingPrefix: string;
	messageSpacing: MessageSpacing;
	hiddenThinkingLabel: string;
}

export interface TranscriptLineOptions {
	prefix: string;
	spacing?: MessageSpacing;
	normalizeChecks?: boolean;
	visibleWidth?: (text: string) => number;
}

export const DEFAULT_HIDDEN_THINKING_LABEL = "Pondering...";

const DEFAULT_MESSAGE_CHROME: MessageChromeSettings = {
	messageStyle: "claude",
	assistantPrefix: "●",
	thinkingPrefix: "✻",
	messageSpacing: "comfortable",
	hiddenThinkingLabel: DEFAULT_HIDDEN_THINKING_LABEL,
};

const ANSI_ESCAPE_SEQUENCE_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g;
const ANSI_SGR_RE = /\x1b\[[0-9;]*m/g;
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/g;
const MAX_PREFIX_GRAPHEMES = 8;
const MAX_LABEL_GRAPHEMES = 80;

function stripAnsi(text: string): string {
	return text.replace(ANSI_ESCAPE_SEQUENCE_RE, "").replace(ANSI_SGR_RE, "");
}

function stripControlChars(text: string): string {
	return text.replace(CONTROL_CHARS_RE, "");
}

function takeGraphemes(text: string, max: number): string {
	return Array.from(text).slice(0, max).join("");
}

function fallbackVisibleWidth(text: string): number {
	return Array.from(stripAnsi(text)).length;
}

function isBlankLine(text: string): boolean {
	return stripAnsi(text).trim().length === 0;
}

function sanitizeTextSetting(value: unknown, fallback: string, maxGraphemes: number): string {
	if (typeof value !== "string") return fallback;
	const cleaned = takeGraphemes(stripControlChars(stripAnsi(value)).trim(), maxGraphemes);
	return cleaned || fallback;
}

export function sanitizeMessagePrefix(value: unknown, fallback: string): string {
	return sanitizeTextSetting(value, fallback, MAX_PREFIX_GRAPHEMES);
}

export function resolveMessageChromeSettings(input: MessageChromeInput = {}): MessageChromeSettings {
	const messageStyle: MessageStyle = input.messageStyle === "classic" ? "classic" : "claude";
	const messageSpacing: MessageSpacing = input.messageSpacing === "compact" ? "compact" : "comfortable";
	return {
		messageStyle,
		assistantPrefix: sanitizeMessagePrefix(input.assistantPrefix, DEFAULT_MESSAGE_CHROME.assistantPrefix),
		thinkingPrefix: sanitizeMessagePrefix(input.thinkingPrefix, DEFAULT_MESSAGE_CHROME.thinkingPrefix),
		messageSpacing,
		hiddenThinkingLabel: sanitizeTextSetting(input.hiddenThinkingLabel, DEFAULT_MESSAGE_CHROME.hiddenThinkingLabel, MAX_LABEL_GRAPHEMES),
	};
}

function normalizeTranscriptRenderedLines(lines: string[], spacing: MessageSpacing): string[] {
	let start = 0;
	while (start < lines.length && isBlankLine(lines[start])) start++;
	let end = lines.length - 1;
	while (end >= start && isBlankLine(lines[end])) end--;
	if (start > end) return [];

	const normalized: string[] = [];
	let pendingBlank = false;
	for (const line of lines.slice(start, end + 1)) {
		if (isBlankLine(line)) {
			if (spacing === "comfortable" && normalized.length > 0) pendingBlank = true;
			continue;
		}
		if (pendingBlank) {
			normalized.push("");
			pendingBlank = false;
		}
		normalized.push(line);
	}
	return normalized;
}

function normalizeLeadingCheckGlyph(line: string): string {
	return line.replace(/^((?:\x1b\[[0-9;]*m|[ \t])*)[✓✔](?=\s)/, "$1●");
}

export function formatTranscriptLines(lines: string[], options: TranscriptLineOptions): string[] {
	const prefixGlyph = sanitizeMessagePrefix(options.prefix, DEFAULT_MESSAGE_CHROME.assistantPrefix);
	const spacing = options.spacing ?? DEFAULT_MESSAGE_CHROME.messageSpacing;
	const normalized = normalizeTranscriptRenderedLines(lines, spacing);
	const prefix = ` ${prefixGlyph} `;
	const measureWidth = options.visibleWidth ?? fallbackVisibleWidth;
	const continuation = " ".repeat(Math.max(1, measureWidth(prefix)));

	if (normalized.length === 0) return [prefix];

	let prefixPlaced = false;
	return normalized.map((line) => {
		const displayLine = options.normalizeChecks === false ? line : normalizeLeadingCheckGlyph(line);
		if (!prefixPlaced && !isBlankLine(displayLine)) {
			prefixPlaced = true;
			return `${prefix}${displayLine}`;
		}
		return `${continuation}${displayLine}`;
	});
}
