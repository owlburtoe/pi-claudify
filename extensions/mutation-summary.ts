/**
 * Result sentences for mutating tools.
 *
 * Claude Code states what changed in prose rather than a stat bar:
 *   ⏺ Write(/tmp/ccprobe.txt)
 *     ⎿  Wrote 1 line to ../../../../tmp/ccprobe.txt
 *   ⏺ Update(/tmp/ccprobe.txt)
 *     ⎿  Added 1 line, removed 1 line
 *
 * Grammar captured in docs/plans/2026-07-13-current-cc-grammar.md.
 */

function plural(count: number, singular: string): string {
	return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export function describeWrite(lineCount: number, displayPath: string): string {
	const lines = Math.max(0, Math.trunc(lineCount));
	return `Wrote ${plural(lines, "line")} to ${displayPath}`;
}

export function describeEdit(added: number, removed: number): string {
	const additions = Math.max(0, Math.trunc(added));
	const removals = Math.max(0, Math.trunc(removed));
	const clauses: string[] = [];
	if (additions > 0) clauses.push(`Added ${plural(additions, "line")}`);
	if (removals > 0) clauses.push(`${clauses.length ? "removed" : "Removed"} ${plural(removals, "line")}`);
	return clauses.length === 0 ? "No changes" : clauses.join(", ");
}
