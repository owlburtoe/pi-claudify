/**
 * Phrasing for grouped read-only tool calls.
 *
 * Claude Code aggregates read-only tools under one gerund header while they run
 * ("⏺ Searching for 1 pattern, reading 2 files, running 1 shell command…") and
 * collapses the block to a past-tense summary once the turn ends
 * ("Read 1 file, ran 1 shell command").
 *
 * Grammar captured in docs/plans/2026-07-13-current-cc-grammar.md.
 */

export type InspectionKind = "grep" | "find" | "ls" | "read" | "bash";

interface ClauseForms {
	/** While running: "searching for 2 patterns". */
	active: (count: number) => string;
	/** After the turn: "searched for 2 patterns". */
	done: (count: number) => string;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
	return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Clause order is fixed, not call order — Claude Code always reads
 * "Searching for 1 pattern, reading 2 files, running 1 shell command…".
 */
const CLAUSE_ORDER: InspectionKind[] = ["grep", "find", "ls", "read", "bash"];

const CLAUSES: Record<InspectionKind, ClauseForms> = {
	grep: {
		active: (n) => `searching for ${plural(n, "pattern")}`,
		done: (n) => `searched for ${plural(n, "pattern")}`,
	},
	find: {
		active: (n) => `finding ${plural(n, "file")}`,
		done: (n) => `found ${plural(n, "file")}`,
	},
	ls: {
		active: (n) => `listing ${plural(n, "directory", "directories")}`,
		done: (n) => `listed ${plural(n, "directory", "directories")}`,
	},
	read: {
		active: (n) => `reading ${plural(n, "file")}`,
		done: (n) => `read ${plural(n, "file")}`,
	},
	bash: {
		active: (n) => `running ${plural(n, "shell command")}`,
		done: (n) => `ran ${plural(n, "shell command")}`,
	},
};

function capitalize(text: string): string {
	return text.length === 0 ? text : `${text[0].toUpperCase()}${text.slice(1)}`;
}

function countByKind(kinds: InspectionKind[]): Map<InspectionKind, number> {
	const counts = new Map<InspectionKind, number>();
	for (const kind of kinds) {
		counts.set(kind, (counts.get(kind) ?? 0) + 1);
	}
	return counts;
}

function joinClauses(kinds: InspectionKind[], form: keyof ClauseForms): string {
	const counts = countByKind(kinds);
	const clauses = CLAUSE_ORDER.filter((kind) => counts.has(kind)).map((kind) =>
		CLAUSES[kind][form](counts.get(kind) as number),
	);
	return capitalize(clauses.join(", "));
}

/** Header shown while the grouped tools are still running. Ends in an ellipsis. */
export function describeInspectionsActive(kinds: InspectionKind[]): string {
	if (kinds.length === 0) return "";
	return `${joinClauses(kinds, "active")}…`;
}

/** Collapsed summary shown once the turn ends. No ellipsis, no bullet. */
export function describeInspectionsDone(kinds: InspectionKind[]): string {
	if (kinds.length === 0) return "";
	return joinClauses(kinds, "done");
}
