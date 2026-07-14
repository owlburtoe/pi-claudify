# pi-claude-style-tools

Claude Code inspired tool rendering for Pi — Shiki-powered diffs, status dots, branch connectors, file icons, and configurable output modes.

## Requirements

pi **0.74.0 or newer**. pi renamed its npm scope from `@mariozechner/*` to `@earendil-works/*` in 0.74.0, and this extension imports the new scope. If you are on an older pi, run `pi update` first.

## Features

- **Compact Claude Code-like tool rendering** for `read`, `bash`, `grep`, `find`, `ls`, `edit`, and `write`, including `⏺ Tool(args)` headers and `⎿` result rows
- **Transcript grammar matched to Claude Code v2.1.207**, captured live rather than reconstructed — `❯` user rows with no box, `⏺` bullets at column 0, `␣␣⎿␣␣` result gutters, `(ctrl+o to expand)` hints, and `✻ Cooked for 8s` worked lines. See [docs/plans/2026-07-13-current-cc-grammar.md](docs/plans/2026-07-13-current-cc-grammar.md)
- **Semantic bash display** that renders common read-only shell one-liners like `nl -ba file | sed -n '1,200p'` as Claude Code-style `Read file (lines 1-200)` rows
- **Aggregated read-only tools** under a gerund header (`⏺ Searching for 1 pattern, reading 2 files…`) with one `⎿` per target, collapsing to a dim `Read 1 file, ran 1 shell command` once the turn settles — the model current Claude Code uses
- **Claude-style OpenAI tool rendering** for `apply_patch` plus common Pi/OpenAI-style tools like `webfetch`, `web_search`, `fetch_content`, task tools, and context tools
- **`apply_patch` diff previews** that render parsed file patches in the call phase, similar to `edit`/`write`
- **Claude Code diff bodies** — unified hunks with a ` N ` gutter and sign column, no box chrome, Claude's exact red/green palette, brighter backgrounds on changed tokens, and unhighlighted removals; writes render as a plain numbered listing
- **Sentence result rows** (`Wrote 3 lines to <path>`, `Added 2 lines, removed 2 lines`) instead of stat bars
- **Claude Code tool chrome** — the `⏺` bullet goes gray → green as a tool succeeds, tool names are bold, and file paths are OSC 8 hyperlinks you can click to open the file
- **Progressive collapsed diff hints** that shorten on narrow terminals
- **Thinking labels** during streaming and final messages, with context sanitization
- **Claude-style transcript grammar controls** for assistant/thinking prefixes, message spacing, and hidden thinking labels
- **Claude Code MCP rendering** — Claude Code gives MCP calls no tool row of their own: no header, no `⎿` result row, no arguments, no result preview, and no difference between read-only, mutating, and failing tools. An MCP call adds one clause, naming the **server**, to the aggregated inspection group, which collapses when the turn settles — `⏺ Calling plane, forgejo, obsidian 3 times…` while running, `Called plane, forgejo, obsidian 3 times` once done, and `Read 1 file, called probe, ran 1 shell command` when mixed with built-ins. This package now does the same, replacing the old `⏺ MCP(plane:plane_list_work_items)` / `1 line returned` rows. Grammar captured live from Claude Code, not reconstructed: [docs/plans/2026-07-13-mcp-grammar.md](docs/plans/2026-07-13-mcp-grammar.md). Works for every MCP server and both of pi's exposure modes — the `mcp` proxy tool and directly-registered tools (`plane_get_me`, or a bare `get_me` when the server prefix is off) — with nothing server-specific hardcoded. Set `readOnlyToolGrouping: false` to opt out and get per-call rows honoring `mcpOutputMode` instead
- **Configurable output modes** for read, search, bash, and MCP results
- **Transparent tool backgrounds** in `transparent` or `border` mode
- **Theme-adaptive palette** — borders, branch connectors, dim text, spinner accent, and diff backgrounds automatically follow the active pi theme (set `themeAdaptive: false` to keep the fixed Claude-style palette)
- **Transparent edit/write diffs** with universal red/green diff colors
- **Global border patch** for all tool rows, including unknown/custom tools

## Configuration

Set in `.pi/settings.json` or `~/.pi/settings.json`:

```json
{
  "toolBackground": "transparent",
  "readOutputMode": "preview",
  "searchOutputMode": "preview",
  "mcpOutputMode": "preview",
  "previewLines": 8,
  "bashOutputMode": "opencode",
  "bashCollapsedLines": 10,
  "bashStackConsecutive": true,
  "bashSemanticDisplay": true,
  "readOnlyToolGrouping": true,
  "readOnlyToolGroupLimit": 5,
  "diffCollapsedLines": 24,
  "themeAdaptive": true,
  "diffPalette": "claude",
  "toolChrome": "claude",
  "diffTheme": "monokai",
  "spinnerColor": "borderAccent",
  "spinnerVerbs": ["Reviewing", "Polishing"],
  "spinnerVerbMode": "append",
  "messageStyle": "claude",
  "assistantPrefix": "⏺",
  "thinkingPrefix": "✻",
  "messageSpacing": "comfortable",
  "hiddenThinkingLabel": "Pondering...",
  "workedVerbs": ["Hacked", "Tinkered"],
  "workedVerbMode": "append"
}
```

### Theme integration

When `themeAdaptive` is `true` (default), the following colors are derived from the active pi theme on every render and re-derived whenever the theme changes:

| Element | Derived from |
|---------|--------------|
| Tool outline borders (top/bottom rules) | `borderMuted` |
| Branch connectors (`├─`, `└─`, `│`) | `dim` (fallback: `muted`) |
| "✻ Cooked for 8s" worked line | `muted` |
| Thinking-block italic gray | `muted` |
| Diff add/remove accents | `toolDiffAdded` / `toolDiffRemoved` (only when `diffPalette: "theme"`) |
| Diff background tints | mixed against `toolSuccessBg` base (only when `diffPalette: "theme"`) |
| Spinner glyph + verb text (`✻ Working…`) | `borderAccent` (fallback: `accent`) |
| Spinner status text | `muted` |

User-supplied `diffTheme` presets and `diffColors` overrides always win over theme-derived defaults. File-type icons (e.g. `ts`, `py`, `rs`) keep their language-identity colors and are not theme-derived.

Set `themeAdaptive: false` to keep the original fixed Claude-style palette regardless of the active pi theme.

### Tool row chrome

`toolChrome` defaults to `"claude"`, which mirrors how Claude Code signals what a tool is
doing and whether it worked:

- **The bullet carries the status.** `⏺` is gray while the tool runs and turns green once
  it actually succeeded (red on failure). It's the only color in the row.
- **File paths are clickable, not colored.** Paths are wrapped in OSC 8 hyperlinks
  (`file://…`), so a supporting terminal (iTerm2, WezTerm, Ghostty, Kitty, VS Code) opens
  the file on click. Claude Code tints nothing here — emphasis comes from **bold**.
- **The tool name is bold** in the default foreground; parens are plain.
- **Result rows bold the load-bearing facts** — the line counts and the path — against
  plain text, with the `⎿` gutter in gray.

Terminals without OSC 8 support ignore the escape and show the plain path. The links are
zero-width, so they never affect wrapping or alignment.

Set `toolChrome: "theme"` to go back to accent-tinted arguments and a themed tool title.

### Diff palette

`diffPalette` defaults to `"claude"`: diffs render exactly as Claude Code does — always
unified, no box chrome, and a fixed palette taken from Claude Code's own output
(removed `#3D0100` on `#DC5A5A`, added `#022800` on `#50C850`, with brighter
backgrounds on the changed token). Removed lines are intentionally not
syntax-highlighted, matching Claude Code. Pair it with `diffTheme: "monokai"` for
Claude's syntax colors.

Set `diffPalette: "theme"` to restore the theme-derived tints and the adaptive
split/unified layout.

#### Toggle at runtime with `/cc-theme`

```text
/cc-theme           # show current setting + theme name
/cc-theme status    # show current setting + color preview (incl. spinner)
/cc-theme on        # follow pi theme
/cc-theme off       # keep fixed Claude palette
/cc-theme toggle    # flip the current value
```

The selection is persisted to `~/.pi/settings.json` and applied to the next rendered tool row. No restart required.

#### Repaint the spinner with `/cc-spinner`

The spinner glyph and verb text (e.g. `✻ Cooking…`) share `borderAccent` by default so the working indicator reads as one unit. The status suffix (e.g. `(thinking · ↓ 10 tokens · 2s)`) follows `muted`. Use `/cc-spinner` to bind either text element to any other theme color key:

```text
/cc-spinner preview                  # list every common theme key with a colored sample
/cc-spinner color <key>              # change glyph + verb color together (e.g. thinkingHigh)
/cc-spinner verb <key>               # alias for color, kept for older muscle memory
/cc-spinner status <key>             # change the status suffix color
/cc-spinner reset                    # restore color defaults (spinner=borderAccent, status=muted)
/cc-spinner verbs list               # show custom spinner verbs and append/replace mode
/cc-spinner verbs add Reviewing      # add a custom verb or phrase
/cc-spinner verbs remove Reviewing   # remove a custom verb or phrase
/cc-spinner verbs mode append        # append custom verbs to the defaults
/cc-spinner verbs mode replace       # use only custom verbs, with safe fallback to defaults
/cc-spinner verbs reset              # remove user custom verbs and mode
```

Color selections are persisted as `spinnerColor` / `spinnerStatusColor` in `~/.pi/settings.json` and applied on the next spinner tick. Older `spinnerVerbColor` settings still work as a backward-compatible alias. Custom verbs are persisted as `spinnerVerbs` and `spinnerVerbMode`; they are picked at the next turn start. `/cc-spinner verbs ...` writes user settings in `~/.pi/settings.json`; project-level custom verbs can be set manually in `.pi/settings.json`. When both project and user spinner settings exist, the spinner reader applies project settings first and user settings second.

#### Tune assistant/thinking transcript chrome with `/cc-message`

```text
/cc-message                              # show current message chrome settings
/cc-message style claude                 # screenshot-style transcript rhythm
/cc-message style classic                # older package spacing/prefix behavior
/cc-message spacing comfortable          # keep one blank line between paragraphs
/cc-message spacing compact              # remove blank lines inside assistant/thinking blocks
/cc-message assistant-prefix ⏺           # set assistant paragraph prefix
/cc-message thinking-prefix ✻            # set visible thinking prefix
/cc-message hidden-thinking-label Pondering...
/cc-message reset                        # restore message chrome defaults
```

`messageStyle: "claude"` trims leading/trailing blank render lines, collapses paragraph gaps, and aligns wrapped assistant/thinking lines under the message body, matching Claude Code's sparse transcript grammar. `messageStyle: "classic"` keeps the previous package behavior.

#### Custom worked verbs

Each finished turn is named with a past-tense verb — `✻ Cooked for 8s`, `✻ Sautéed for 11s`.
One is picked per turn and stays stable across repaints. You can supply your own:

```text
/cc-message verbs list                   # show custom verbs, mode, and the active pool
/cc-message verbs add Hacked             # add a verb
/cc-message verbs add Cooked up a storm  # multi-word phrases work
/cc-message verbs remove Hacked          # remove one
/cc-message verbs mode replace           # use ONLY your verbs
/cc-message verbs mode append            # add yours to the built-in pool (default)
/cc-message verbs reset                  # back to the built-in verbs
```

Or set them directly in `settings.json`:

```json
{
  "workedVerbs": ["Hacked", "Tinkered", "Cooked up a storm"],
  "workedVerbMode": "replace"
}
```

`append` (the default) merges your verbs into the built-in pool; `replace` draws only from
yours. An empty list always falls back to the built-ins, so a bad config can't leave the
worked line verbless. This is a deliberate departure from Claude Code, which has no such
setting.

### Tool background modes

| Value | Behavior |
|-------|----------|
| `default` | Standard Pi tool backgrounds |
| `transparent` | Transparent tool backgrounds |
| `border` | Transparent backgrounds with top/bottom border lines (alias for `outlines`) |
| `outlines` | Transparent backgrounds with top/bottom border lines |

### Output modes

| Setting | Values | Default |
|---------|--------|---------|
| `readOutputMode` | `hidden`, `summary`, `preview` | `preview` |
| `searchOutputMode` | `hidden`, `count`, `preview` | `preview` |
| `mcpOutputMode` | `hidden`, `summary`, `preview` | `preview` |
| `bashOutputMode` | `opencode`, `summary`, `preview` | `opencode` |

`bashOutputMode` behavior:

| Value | Behavior |
|-------|----------|
| `opencode` | Compact status while collapsed, with `Ctrl+O` hint for output preview on raw shell commands. Semantic read-only bash rows omit the repeated hint to stay closer to Claude Code. |
| `summary` | Status only; no output preview or expansion hint |
| `preview` | Show a small output preview even while collapsed |

### Boolean settings

| Setting | Default | Description |
|---------|---------|-------------|
| `bashStackConsecutive` | `true` | Remove the extra synthetic spacer between adjacent bash tool rows so command bursts render as a tight stack |
| `bashSemanticDisplay` | `true` | Render common read-only shell file-inspection commands as semantic `Read` rows instead of raw `Bash` rows |
| `readOnlyToolGrouping` | `true` | Aggregate adjacent read-only tools (`read`/`grep`/`find`/`ls`/`bash`) under one gerund header, collapsing to a dim past-tense summary once they settle; mutating `write`/`edit`/`apply_patch` rows stay independent |

### Numeric settings

| Setting | Default | Description |
|---------|---------|-------------|
| `previewLines` | `8` | Lines shown in collapsed preview mode |
| `expandedPreviewMaxLines` | `4000` | Max lines when fully expanded |
| `bashCollapsedLines` | `10` | Lines for collapsed bash output |
| `diffCollapsedLines` | `24` | Diff lines before collapsing |
| `readOnlyToolGroupLimit` | `5` | Max inspection entries shown inside a grouped read-only tool block |

## Notes

This package targets recent Pi versions where tool renderers use:

- `renderCall(args, theme, context)`
- `renderResult(result, { expanded, isPartial }, theme, context)`

Unknown/custom tools do not have a public global renderer hook in Pi, so this package patches container rendering to add top/bottom borders for all tool executions in border mode.

## Credits

This project builds upon and was inspired by the excellent work of:

- **[@heyhuynhgiabuu/pi-pretty](https://github.com/buddingnewinsights/pi-pretty)** by [huynhgiabuu](https://github.com/buddingnewinsights) — Pretty terminal output with syntax-highlighted file reads, colored bash output, and tree-view directory listings
- **[@heyhuynhgiabuu/pi-diff](https://github.com/buddingnewinsights/pi-diff)** by [huynhgiabuu](https://github.com/buddingnewinsights) — Shiki-powered terminal diff renderer with word-level diffs in split and unified views
- **[pi-tool-display](https://github.com/MasuRii/pi-tool-display)** by [MasuRii](https://github.com/MasuRii) — Compact tool call rendering, diff visualization, and output truncation
