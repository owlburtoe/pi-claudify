import assert from "node:assert/strict";

import { ToolExecutionComponent } from "@earendil-works/pi-coding-agent";
import { Container } from "@earendil-works/pi-tui";
import { initTheme } from "../node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js";

import extension, { classifyBashCommandForDisplay } from "../extensions/index.ts";

assert.deepEqual(
	classifyBashCommandForDisplay("nl -ba apps/backend/src/lib/notification-unsubscribe.ts | sed -n '1,200p'"),
	{
		kind: "read",
		label: "Read",
		path: "apps/backend/src/lib/notification-unsubscribe.ts",
		rangeLabel: "lines 1-200",
		suppressCollapsedHint: true,
	},
);

assert.deepEqual(
	classifyBashCommandForDisplay('sed -n "960,1015p" apps/backend/src/db/schema.ts'),
	{
		kind: "read",
		label: "Read",
		path: "apps/backend/src/db/schema.ts",
		rangeLabel: "lines 960-1015",
		suppressCollapsedHint: true,
	},
);

assert.deepEqual(
	classifyBashCommandForDisplay("cat 'docs/plans/semantic bash.md'"),
	{
		kind: "read",
		label: "Read",
		path: "docs/plans/semantic bash.md",
		suppressCollapsedHint: true,
	},
);

assert.deepEqual(
	classifyBashCommandForDisplay("head -n 40 README.md"),
	{
		kind: "read",
		label: "Read",
		path: "README.md",
		rangeLabel: "first 40 lines",
		suppressCollapsedHint: true,
	},
);

assert.deepEqual(
	classifyBashCommandForDisplay("tail -25 package-lock.json"),
	{
		kind: "read",
		label: "Read",
		path: "package-lock.json",
		rangeLabel: "last 25 lines",
		suppressCollapsedHint: true,
	},
);

assert.equal(classifyBashCommandForDisplay("npm test"), null);
assert.equal(classifyBashCommandForDisplay("nl -ba a.ts | grep TODO"), null);
assert.equal(classifyBashCommandForDisplay("nl -ba a.ts | sed -n '1,20p' | head"), null);
assert.equal(classifyBashCommandForDisplay("cat a.ts b.ts"), null);
assert.equal(classifyBashCommandForDisplay("cat -"), null);
assert.equal(classifyBashCommandForDisplay("cd apps && cat package.json"), null);

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

function completedTool(pi: FakePi, name: string, id: string, args: any, text: string, details: any = {}): ToolExecutionComponent {
	const tool = pi.tools.get(name);
	assert.ok(tool, `${name} tool registered`);
	const component = new ToolExecutionComponent(
		name,
		id,
		args,
		{ showImages: false },
		tool,
		{ requestRender() {}, previousLines: [] } as any,
		process.cwd(),
	);
	component.markExecutionStarted();
	component.setArgsComplete();
	component.updateResult({ content: [{ type: "text", text }], details, isError: false } as any, false);
	return component;
}

/** Dispatched but not yet settled — the group must stay expanded. */
function runningTool(pi: FakePi, name: string, id: string, args: any): ToolExecutionComponent {
	const tool = pi.tools.get(name);
	assert.ok(tool, `${name} tool registered`);
	const component = new ToolExecutionComponent(
		name,
		id,
		args,
		{ showImages: false },
		tool,
		{ requestRender() {}, previousLines: [] } as any,
		process.cwd(),
	);
	component.markExecutionStarted();
	component.setArgsComplete();
	return component;
}

initTheme("dark", false);
const pi = new FakePi();
extension(pi as any);
const bashTool = pi.tools.get("bash");
assert.ok(bashTool);

const component = new ToolExecutionComponent(
	"bash",
	"tool-bash-read",
	{ command: "nl -ba apps/backend/src/lib/notification-unsubscribe.ts | sed -n '1,200p'" },
	{ showImages: false },
	bashTool,
	{ requestRender() {}, previousLines: [] } as any,
	process.cwd(),
);
component.markExecutionStarted();
component.setArgsComplete();
component.updateResult({
	content: [{ type: "text", text: "     1\talpha\n     2\tbeta" }],
	details: {},
} as any, false);

const rendered = component.render(120).map((line) => line.replace(/\x1b\]8;;[^\x07]*\x07/g, "").replace(/\x1b\[[0-9;]*m/g, "").replace(/\s+$/, "")).join("\n");
assert.match(rendered, /⏺ Read\(apps\/backend\/src\/lib\/notification-unsubscribe\.ts \(lines 1-200\)\)/);
assert.match(rendered, /⎿  Read 2 lines/);
assert.doesNotMatch(rendered, /Bash nl -ba/);
assert.doesNotMatch(rendered, /Ctrl\+O/);


const groupedContainer = new Container();
groupedContainer.addChild(completedTool(pi, "read", "read-one", { path: "src/one.ts" }, "alpha\nbeta"));
groupedContainer.addChild(completedTool(pi, "grep", "grep-one", { pattern: "alpha", path: "src" }, "one.ts:1: alpha\ntwo.ts:2: alpha"));
groupedContainer.addChild(completedTool(pi, "find", "find-one", { pattern: "*.ts", path: "src" }, "one.ts\ntwo.ts\nthree.ts"));
groupedContainer.addChild(completedTool(pi, "read", "read-two", { path: "src/two.ts", offset: 1, limit: 20 }, "gamma"));
groupedContainer.addChild(completedTool(pi, "grep", "grep-two", { pattern: "gamma", path: "src/two.ts" }, "two.ts:1: gamma"));
groupedContainer.addChild(completedTool(pi, "read", "read-three", { path: "src/three.ts" }, "delta"));
groupedContainer.addChild(completedTool(pi, "write", "write-one", { path: "src/write.ts", content: "next\n" }, "ok", { _type: "new", lines: 2, filePath: "src/write.ts" }));

const groupedRendered = groupedContainer.render(120).map((line) => line.replace(/\x1b\]8;;[^\x07]*\x07/g, "").replace(/\x1b\[[0-9;]*m/g, "").replace(/\s+$/, "")).join("\n");

// Every read-only tool has settled, so Claude Code collapses the whole block to a
// single dim past-tense line with no bullet. Grammar:
// docs/plans/2026-07-13-current-cc-grammar.md
assert.match(groupedRendered, /^ {2}Searched for 2 patterns, found 1 file, read 3 files$/m);
assert.doesNotMatch(groupedRendered, /Inspect\(/);
assert.doesNotMatch(groupedRendered, /tool uses/);
assert.doesNotMatch(groupedRendered, /lines loaded/);
assert.doesNotMatch(groupedRendered, /^⏺ Read\(src\/one\.ts\)/m);

// Mutating tools keep their own row and never join the group.
// The label is Write (never "Create") and the result is a sentence.
assert.match(groupedRendered, /^⏺ Write\(src\/write\.ts\)/m);
// "next\n" is one line — the trailing newline terminates it, it does not add a line.
assert.match(groupedRendered, /⎿ {2}Wrote 1 line to src\/write\.ts/);
assert.doesNotMatch(groupedRendered, /⏺ Create\(/);

// While tools are still running the group stays expanded: gerund header, one ⎿ per
// target, bare paths, `$ cmd` for shell.
const activeContainer = new Container();
activeContainer.addChild(runningTool(pi, "read", "run-read", { path: "src/one.ts" }));
activeContainer.addChild(runningTool(pi, "read", "run-read-2", { path: "src/two.ts" }));
activeContainer.addChild(runningTool(pi, "bash", "run-bash", { command: "git log --oneline -3" }));

const activeRendered = activeContainer.render(120).map((line) => line.replace(/\x1b\]8;;[^\x07]*\x07/g, "").replace(/\x1b\[[0-9;]*m/g, "").replace(/\s+$/, "")).join("\n");
assert.match(activeRendered, /^⏺ Reading 2 files, running 1 shell command…$/m);
assert.match(activeRendered, /^ {2}⎿ {2}src\/one\.ts$/m);
assert.match(activeRendered, /^ {2}⎿ {2}src\/two\.ts$/m);
assert.match(activeRendered, /^ {2}⎿ {2}\$ git log --oneline -3$/m);

console.log("bash display tests passed");
