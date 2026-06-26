# Claude-style Transcript Grammar Polish

Status: draft  
Date: 2026-06-05  
Scope: visual fidelity only; no provider/tool behavior changes.

## Screenshot-derived target

The current Claude Code screenshot reads as a sparse transcript rather than a boxed chat UI:

- Assistant text rows start with a white `●`, then body text. Wrapped lines align under the body text, not under the dot.
- Tool rows start with a status dot (`●` green when allowed/successful), a bold tool label, and compact arguments. Wrapped command arguments indent under the argument body.
- Tool results hang off a single branch (`└─ ...`) with muted continuation lines.
- Active work uses an orange star-like spinner row: `✶ Marching on the Black Gate… (3m 21s · ↓ 8.4k tokens)`.
- The transcript avoids box chrome around messages; spacing and indentation carry the hierarchy.

This repo already implements much of that grammar in `extensions/index.ts`: `DottedParagraph`, `ThinkingParagraph`, `patchAssistantMessages()`, tool status dots, branch connectors, and the spinner extension. The first slice should refine those surfaces rather than add new UI regions.

## Goals

1. Make assistant message rendering more intentionally Claude-like:
   - one expressive `●` per assistant answer,
   - stable continuation indentation,
   - predictable blank-line rhythm,
   - no accidental heading marker artifacts.
2. Make thinking/working rows match the same transcript grammar:
   - thinking content remains dim/italic and does not leak presentation text into model context,
   - active working text stays focused on the spinner/status line only.
3. Keep behavior configurable so users can return to the current package style if preferred.

## Non-goals

- Do not change built-in tool execution behavior.
- Do not implement permission/auto-mode behavior yet, even though the screenshot shows “Allowed by auto mode classifier.”
- Do not redesign the footer/status line in this slice.
- Do not change diff rendering except where wrapping/spacing intersects with transcript rhythm.

## Recommended approach

Implement a small “message chrome” layer inside the existing extension rather than introducing a separate extension file.

### Settings

Extend `SettingsFile` in `extensions/index.ts` with optional visual settings:

```ts
messageStyle?: "classic" | "claude";
assistantPrefix?: string;
thinkingPrefix?: string;
messageSpacing?: "compact" | "comfortable";
```

Defaults:

- `messageStyle: "claude"`
- `assistantPrefix: "●"`
- `thinkingPrefix: "✻"`
- `messageSpacing: "comfortable"`

### Commands

Add `/cc-message` with completions:

```text
/cc-message                 # show current message chrome settings
/cc-message style claude    # screenshot-style transcript grammar
/cc-message style classic   # current behavior fallback
/cc-message spacing compact
/cc-message spacing comfortable
/cc-message assistant-prefix <glyph>
/cc-message thinking-prefix <glyph>
/cc-message reset
```

This gives us room to tune defaults without trapping users in a single taste.

### Assistant paragraph rendering

Refactor `DottedParagraph` into a slightly more general transcript paragraph renderer:

- trim leading/trailing blank render lines,
- collapse excessive blank lines to one visual blank in `comfortable` mode and no extra blanks in `compact` mode,
- apply the assistant prefix only to the first non-empty rendered line,
- render continuation lines with the exact visible width of `" <prefix> "`,
- keep the existing task-status checkmark normalization.

This should preserve the screenshot’s line rhythm:

```text
 ● Pushed b0e53030. Let me verify...
   continuation aligns here when wrapped
```

### Thinking rows

Keep `ThinkingParagraph` dim/italic, but make the prefix configurable through the same message chrome settings. Avoid injecting hard-coded visible labels into the model-facing message where possible; continue stripping presentation artifacts in the `context` hook.

If Pi’s hidden thinking API is available in the current runtime, apply a default Claude-ish hidden label during `session_start`, for example `Pondering…`, but keep this secondary to the visible transcript work.

### Active working row

Keep the active row to the spinner and status text only:

```text
✶ Marching on the Black Gate… (3m 21s · ↓ 8.4k tokens)
```

Avoid adding subordinate helper copy beneath the working message so the loader stays compact and does not repeat hard-coded guidance.

## Implementation touchpoints

- `extensions/index.ts`
  - `SettingsFile` additions.
  - read/write helpers for `/cc-message`.
  - `DottedParagraph` refactor.
  - `ThinkingParagraph` prefix setting.
  - `registerThinkingLabels()` context-stripping review.
  - optional `ctx.ui.setHiddenThinkingLabel()` application on `session_start`.
- `extensions/spinner.ts`
  - spinner/status message polishing only; no subordinate helper copy.
- `README.md`
  - document `/cc-message` and settings.
- `config/config.example.json`
  - include new message chrome defaults.
- `scripts/benchmark-tools.ts`
  - no required change, but use it to guard render performance.

## Verification plan

1. Type/check focused files with LSP diagnostics after edits.
2. Run the existing benchmark in patched/full mode:
   - `npm run bench:tools -- full 120 4 3`
3. Manually launch Pi with the extension and compare against the screenshot:
   - assistant message wrap alignment,
   - thinking row prefix/color,
   - active spinner row without subordinate helper copy,
   - no duplicated `Worked for` lines,
   - presentation artifacts stripped from future model context.
4. Toggle `/cc-message style classic` and confirm the previous behavior remains available.

## Open questions

- Should `messageStyle: "claude"` become the package default immediately, or should it ship as opt-in for one release?
- Should `toolBackground` default move toward `transparent` to better match the screenshot, or remain controlled by `/cc-tools` outside this slice?
