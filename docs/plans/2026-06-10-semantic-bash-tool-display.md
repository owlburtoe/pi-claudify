# Semantic Bash Tool Display Polish

Status: implemented
Date: 2026-06-10
Scope: visual rendering only; no bash execution or model-visible tool result changes.

## Problem

Even after consecutive bash rows are tight-stacked, file-inspection shell one-liners still read as raw bash noise:

```text
● Bash nl -ba apps/backend/src/lib/notification-unsubscribe.ts | sed -n '1,2...
└─ Done (166 lines) • Ctrl+O to expand
```

The command is semantically a file read, but the transcript foregrounds shell syntax. Repeated file-inspection commands therefore look like command spam rather than Claude Code-style tool activity.

## Target

Render common read-only shell file-inspection commands as semantic tool rows:

```text
● Read apps/backend/src/lib/notification-unsubscribe.ts (lines 1-200)
└─ Read 166 lines
```

Keep the underlying bash tool call and result unchanged for the LLM/session. This is display-only.

## Approach

- Add a small bash-command classifier used only by the bash renderer.
- Detect common file-read forms:
  - `nl -ba <path> | sed -n '<start>,<end>p'`
  - `sed -n '<start>,<end>p' <path>`
  - `cat <path>`
  - `head -n <n> <path>`
  - `tail -n <n> <path>`
- When classified as a file read:
  - render call label as `Read`, not `Bash`;
  - render summary as the path plus optional line-range metadata;
  - render success status as `Read N lines`, not `Done (N lines)`;
  - omit the repeated collapsed `Ctrl+O` hint for these pseudo-read bash rows to reduce visual noise.
- Leave unknown shell commands on the existing `Bash <command>` path.
- Add `bashSemanticDisplay?: boolean` setting, default `true`, for opt-out.

## Verification

- Add a focused classifier test script.
- Run existing message chrome test.
- Run LSP diagnostics on changed TypeScript files.
- Optionally run the render benchmark to guard regressions.
