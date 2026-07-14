# Claude Code MCP Tool Grammar

Status: ground truth
Date: 2026-07-13
Method: live capture of `claude` v2.1.x in a cmux pane via `cmux read-screen`, polled at
0.6s through whole turns. Probed against four real MCP servers (forgejo, obsidian,
openosint, plane) plus a purpose-built stdio MCP server exposing a read-only tool, a
mutating tool (`readOnlyHint: false`, `destructiveHint: true`), and an always-failing
tool. Not reconstructed from memory or screenshots.

## The model: MCP is a clause in the read-only aggregate, nothing more

Claude Code does **not** give MCP calls their own tool rows. There is no
`⏺ server - tool (MCP)(args…)` header, no `⎿` result row, no argument display, no
result preview, and no `ctrl+o` expansion. An MCP call contributes exactly one clause
to the same aggregated inspection group that `Read`/`Grep`/`Glob`/`Bash` feed, and that
group collapses to a single dim line when the turn settles.

The clause names the **servers**, not the tools:

```
⏺ Calling probe…
  Called probe
```

```
⏺ Calling openosint, forgejo, obsidian, plane 6 times…
  Called openosint, forgejo, obsidian, plane 6 times
```

- Servers are deduplicated and listed in **first-seen order**.
- The trailing count is the number of **calls**, not the number of servers.
- The count is **omitted entirely when there is exactly one call** (`Called probe`, never
  `Called probe 1 time`).
- Active form ends in `…`; the settled form does not.

## No read/write distinction

A tool declaring `readOnlyHint: false, destructiveHint: true` renders **identically** to a
read-only one — same `Calling`/`Called` clause, no separate row:

```
⏺ Calling probe…      (probe_write_thing)
  Called probe
```

This is the opposite of built-in tools, where `Write`/`Edit` get persistent individual
rows. Do not special-case mutating MCP tools.

## Failures are invisible in the transcript

A tool returning `isError: true` also collapses to the plain `Called probe` line. The
error text never appears in a tool row — only the model's prose mentions it.

## MCP contributes no `⎿` row

While the group is in flight, `Read` contributes `⎿  sample.txt` and `Bash` contributes
`⎿  $ echo hi`. MCP contributes **nothing**. Across every MCP-only turn captured, zero
`⎿` rows were emitted.

## Clause order

Fixed, not call order. Captured with grep + glob + read + bash + MCP dispatched in one
turn (requested in a different order than rendered):

```
⏺ Searching for 1 pattern, reading 1 file, listing 1 directory, calling probe, running 1 shell command…
  Read 1 file, called probe, ran 1 shell command
```

MCP sits **after the file-inspection clauses and immediately before `bash`**.

## Verbatim captures

Single call, in flight then settled:

```
⏺ Calling probe…
```
```
  Called probe
```

Six calls across four servers:

```
⏺ Calling openosint, forgejo, obsidian, plane 6 times…
```
```
  Called openosint, forgejo, obsidian, plane 6 times
```

Mixed with built-ins:

```
⏺ Reading 1 file, calling probe, running 1 shell command…
  ⎿  $ echo hi
```
```
  Read 1 file, called probe, ran 1 shell command
```
