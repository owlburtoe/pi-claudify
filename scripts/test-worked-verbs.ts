import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolate settings writes: writeSettingsKey persists to $HOME/.pi/settings.json.
const sandbox = mkdtempSync(join(tmpdir(), "cc-verbs-"));
process.env.HOME = sandbox;

const { default: extension } = await import("../extensions/index.ts");
const { formatWorkedLine, resolveWorkedVerbs, DEFAULT_WORKED_VERBS } = await import("../extensions/message-chrome.ts");

class FakePi {
	tools = new Map<string, any>();
	commands = new Map<string, any>();
	events = new Map<string, Array<(...args: any[]) => any>>();
	registerTool(definition: any): void {
		this.tools.set(definition.name, definition);
	}
	registerCommand(name: string, command: any): void {
		this.commands.set(name, command);
	}
	on(name: string, handler: (...args: any[]) => any): void {
		const handlers = this.events.get(name) ?? [];
		handlers.push(handler);
		this.events.set(name, handlers);
	}
	getThinkingLevel(): string {
		return "off";
	}
	getAllTools(): any[] {
		return [...this.tools.values()];
	}
}

const notices: string[] = [];
const ctx = {
	hasUI: true,
	ui: {
		notify(message: string) {
			notices.push(message);
		},
	},
} as any;

const pi = new FakePi();
extension(pi as any);

const ccMessage = pi.commands.get("cc-message");
assert.ok(ccMessage, "/cc-message is registered");

const run = async (args: string): Promise<void> => {
	notices.length = 0;
	await ccMessage.handler(args, ctx);
};

const settings = (): Record<string, unknown> => {
	try {
		return JSON.parse(readFileSync(join(sandbox, ".pi", "settings.json"), "utf8"));
	} catch {
		return {};
	}
};

// Adding verbs accumulates them — a second add must not clobber the first.
await run("verbs add Hacked");
assert.deepEqual(settings().workedVerbs, ["Hacked"]);
await run("verbs add Tinkered");
assert.deepEqual(settings().workedVerbs, ["Hacked", "Tinkered"]);

// Setting the mode must not drop the verbs already stored.
await run("verbs mode replace");
assert.equal(settings().workedVerbMode, "replace");
assert.deepEqual(settings().workedVerbs, ["Hacked", "Tinkered"], "mode write must preserve workedVerbs");

// Multi-word phrases survive.
await run("verbs add Cooked up a storm");
assert.deepEqual(settings().workedVerbs, ["Hacked", "Tinkered", "Cooked up a storm"]);

// Duplicates are rejected, case-insensitively, and leave the list untouched.
await run("verbs add hacked");
assert.deepEqual(settings().workedVerbs, ["Hacked", "Tinkered", "Cooked up a storm"]);
assert.match(notices.join("\n"), /already a custom verb/);

// In replace mode only the custom verbs are drawn from.
const custom = settings().workedVerbs as string[];
const pool = resolveWorkedVerbs(custom, "replace");
assert.deepEqual(pool, ["Hacked", "Tinkered", "Cooked up a storm"]);
assert.equal(formatWorkedLine(8000, { seed: 0, verbs: pool }), "✻ Hacked for 8s");
assert.equal(formatWorkedLine(8000, { seed: 2, verbs: pool }), "✻ Cooked up a storm for 8s");

// Removing a verb keeps the rest.
await run("verbs remove Tinkered");
assert.deepEqual(settings().workedVerbs, ["Hacked", "Cooked up a storm"]);

// An unknown verb name is an error, not a silent no-op.
await run("verbs remove Nonexistent");
assert.match(notices.join("\n"), /Usage: \/cc-message verbs remove/);

// list reports the active pool.
await run("verbs list");
assert.match(notices.join("\n"), /Worked verbs mode: replace/);
assert.match(notices.join("\n"), /Hacked/);

// reset drops back to the built-in pool.
await run("verbs reset");
assert.equal(settings().workedVerbs, undefined);
assert.equal(settings().workedVerbMode, undefined);
assert.ok(resolveWorkedVerbs(undefined, "append").includes(DEFAULT_WORKED_VERBS[0]));

console.log("worked verbs tests passed");
