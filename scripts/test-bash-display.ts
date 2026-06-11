import assert from "node:assert/strict";

import { ToolExecutionComponent } from "@mariozechner/pi-coding-agent";
import { initTheme } from "../node_modules/@mariozechner/pi-coding-agent/dist/modes/interactive/theme/theme.js";

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

const rendered = component.render(120).map((line) => line.replace(/\x1b\[[0-9;]*m/g, "")).join("\n");
assert.match(rendered, /● Read apps\/backend\/src\/lib\/notification-unsubscribe\.ts \(lines 1-200\)/);
assert.match(rendered, /└─ Read 2 lines/);
assert.doesNotMatch(rendered, /Bash nl -ba/);
assert.doesNotMatch(rendered, /Ctrl\+O/);

console.log("bash display tests passed");
