# Bash Tool Stacking Polish

Status: draft  
Date: 2026-06-08  
Scope: visual rendering only; no bash execution or provider behavior changes.

## Problem

Long runs of short bash commands currently dominate the Pi transcript. With `toolBackground: "transparent"` each tool row gets its own leading spacer, and with `bashOutputMode: "opencode"` every completed command renders as:

```text
● Bash <command>
└─ Done (N lines) • Ctrl+O to expand
```

A sequence of small commands therefore burns 2+ visual lines per command, plus inter-tool whitespace. Claude Code keeps repeated shell activity visually stacked/tight instead of making every short command feel like a separate section.

## Findings

- `SettingsFile` declares `bashOutputMode?: "opencode" | "summary" | "preview"`, and README/config document it.
- The bash renderer currently ignores `bashOutputMode`; it always behaves like the documented `opencode` default.
- The global container patch in `patchGlobalToolBorders()` adds a leading spacer for every tool component in transparent/outlines modes.
- Pi tool renderers only render a single tool row; grouping consecutive sibling tool rows requires a parent/container-level render pass or a larger upstream hook.

## Goals

1. Make the documented `bashOutputMode` setting real:
   - `opencode`: current behavior — collapsed summary with Ctrl+O hint; expanded output preview.
   - `summary`: compact result summary only; no Ctrl+O hint/output preview.
   - `preview`: show a small output preview immediately in collapsed mode, with Ctrl+O for more.
2. Tight-stack consecutive bash tool rows by default, removing the extra blank spacer between adjacent bash components.
3. Keep behavior configurable so users can opt out if they prefer the previous separated transcript.

## Non-goals

- Do not change bash execution, truncation, or LLM-visible tool result content.
- Do not introduce a new custom session/message type.
- Do not remove expansion support for individual tool rows.

## Proposed settings

```json
{
  "bashOutputMode": "opencode",
  "bashStackConsecutive": true
}
```

`bashStackConsecutive` defaults to `true` to match the Claude-style transcript direction. Setting it to `false` restores the prior inter-tool spacing.

## Implementation touchpoints

- `extensions/index.ts`
  - Add `bashStackConsecutive?: boolean` to `SettingsFile`.
  - Add a helper for bash output mode.
  - Update the bash `renderResult()` logic to respect `bashOutputMode`.
  - Extend the existing `Container.prototype.render` patch to remove the synthetic leading spacer between adjacent bash tool components.
- `README.md`
  - Document `bashStackConsecutive` and clarify bash output modes.
- `config/config.example.json`
  - Add the default setting.

## Verification plan

1. Run LSP diagnostics for changed TypeScript files.
2. Run `npm run test:message-chrome`.
3. Run `npm run bench:tools -- full 120 4 3` to catch render regressions.
4. Manually reload Pi and verify a run of multiple short bash commands no longer consumes the whole viewport.
