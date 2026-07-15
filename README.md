# pi-claudify

Claude Code style rendering for [pi](https://github.com/earendil-works/pi), published as `@owlburtoe/pi-claudify` (formerly `@owlburtoe/pi-cc-tools`). Tool rows, diffs, and transcript grammar that match what Claude Code actually prints, captured from live sessions instead of guessed.

## Why this exists

I trust Claude Code, and most of that trust comes from its harness and TUI. The transcript stays calm. Every tool call gets a short plain row that tells me what the agent did and whether it worked, and nothing shouts for attention. I can read a whole turn at a glance because the terminal is doing the explaining for me.

When I moved to pi, the agent underneath was great but the transcript was not giving me that same feeling. Tool output was boxy and loud, results took up more room than they earned, and I kept expanding things just to confirm the agent was fine. So this package teaches pi to render its transcript the way Claude Code does, because that rendering is what made me comfortable letting an agent work.

This project began as a fork of [pi-cc-tools](https://github.com/FammasMaz/pi-cc-tools) by Moeeze Hassan ([FammasMaz](https://github.com/FammasMaz)), and his tool renderers are still the foundation. Since then I have rebuilt a lot of it and added the conformance layer, the aggregation and message chrome modules, and the test suite, so it now lives here as its own project.

One rule drives the work: capture, do not guess. When I wanted to know how Claude Code renders MCP calls, I ran Claude Code against a throwaway MCP server and recorded the screen through the whole turn. It turned out Claude gives MCP calls no tool row at all, which no amount of guessing would have produced. Each rendering detail gets captured live and written down in [docs/plans/](docs/plans/) before any code changes, and the tests assert the capture. At the end of the day, a faithful copy of the real thing beats a nice invention.

## What it does

- Tool rows in Claude Code's shape: `⏺ Tool(args)` headers, `⎿` result rows, and a status bullet that goes from gray to green when the tool succeeds (red when it fails). Tool names are bold, and file paths are OSC 8 hyperlinks you can click to open the file.
- Read-only tools (`read`, `grep`, `find`, `ls`, `bash`) aggregate under one gerund header while they run, such as `⏺ Searching for 1 pattern, reading 2 files…`, then collapse to a dim past-tense summary like `Read 1 file, ran 1 shell command` once the turn settles. Mutating tools (`write`, `edit`, `apply_patch`) keep their own rows.
- MCP calls render the way Claude Code renders them, which is barely at all. No header, no result row, no arguments. An MCP call adds one clause naming the server to the aggregated group: `⏺ Calling plane, forgejo 2 times…` while running, `Called plane, forgejo 2 times` when done. This works for every MCP server and both of pi's exposure modes, with nothing server-specific hardcoded. Set `readOnlyToolGrouping: false` if you want per-call rows instead.
- Diffs use Claude Code's exact red and green palette, always unified, with a line-number gutter and no box chrome. Removed lines are left without syntax highlighting because Claude Code leaves them plain too.
- Results read as sentences, such as `Wrote 3 lines to <path>` and `Added 2 lines, removed 2 lines`, instead of stat bars.
- Common read-only shell one-liners render semantically, so `nl -ba file | sed -n '1,200p'` shows up as `Read file (lines 1-200)`.
- Transcript grammar matches Claude Code v2.1.207: `❯` user rows with no box, `⏺` bullets at column 0, `(ctrl+o to expand)` hints, and `✻ Cooked for 8s` worked lines. See [docs/plans/2026-07-13-current-cc-grammar.md](docs/plans/2026-07-13-current-cc-grammar.md).
- OpenAI-style tools get the same treatment: `apply_patch` renders parsed diff previews in the call phase, and `webfetch`, `web_search`, `fetch_content`, task tools, and context tools get Claude-style rows.
- The palette follows your active pi theme by default, with borders, connectors, dim text, spinner accent, and diff backgrounds re-derived on every theme change. Thinking labels, message spacing, spinner verbs, and worked verbs are all configurable.

## Requirements

pi 0.74.0 or newer. pi renamed its npm scope from `@mariozechner/*` to `@earendil-works/*` in 0.74.0, and this package imports the new scope. If you are on an older pi, run `pi update` first.

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

When `themeAdaptive` is `true` (the default), these colors are derived from the active pi theme on every render and re-derived whenever the theme changes:

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

User-supplied `diffTheme` presets and `diffColors` overrides always win over theme-derived defaults. File-type icons (`ts`, `py`, `rs`, and so on) keep their language-identity colors.

Set `themeAdaptive: false` to keep the fixed Claude-style palette no matter which pi theme is active.

### Tool row chrome

`toolChrome` defaults to `"claude"`, which mirrors how Claude Code signals what a tool is doing and whether it worked:

- The bullet carries the status. `⏺` is gray while the tool runs and turns green once it actually succeeded, or red on failure. It is the only color in the row.
- File paths are clickable, not colored. Paths are wrapped in OSC 8 hyperlinks (`file://…`), so a supporting terminal (iTerm2, WezTerm, Ghostty, Kitty, VS Code) opens the file on click.
- The tool name is bold in the default foreground, and the parens are plain.
- Result rows bold the load-bearing facts, meaning the line counts and the path, with the `⎿` gutter in gray.

Terminals without OSC 8 support ignore the escape and show the plain path. The links are zero-width, so they never affect wrapping or alignment.

Set `toolChrome: "theme"` to go back to accent-tinted arguments and a themed tool title.

### Diff palette

`diffPalette` defaults to `"claude"`: diffs render exactly as Claude Code does. Always unified, no box chrome, and a fixed palette taken from Claude Code's own output (removed `#3D0100` on `#DC5A5A`, added `#022800` on `#50C850`, with brighter backgrounds on the changed token). Pair it with `diffTheme: "monokai"` for Claude's syntax colors.

Set `diffPalette: "theme"` to restore the theme-derived tints and the adaptive split/unified layout.

#### Toggle at runtime with `/cc-theme`

```text
/cc-theme           # show current setting + theme name
/cc-theme status    # show current setting + color preview (incl. spinner)
/cc-theme on        # follow pi theme
/cc-theme off       # keep fixed Claude palette
/cc-theme toggle    # flip the current value
```

The selection is persisted to `~/.pi/settings.json` and applied to the next rendered tool row. No restart needed.

#### Repaint the spinner with `/cc-spinner`

The spinner glyph and verb text (`✻ Cooking…`) share `borderAccent` by default so the working indicator reads as one unit. The status suffix (`(thinking · ↓ 10 tokens · 2s)`) follows `muted`. Use `/cc-spinner` to bind either element to any other theme color key:

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

Color selections are persisted as `spinnerColor` / `spinnerStatusColor` in `~/.pi/settings.json` and applied on the next spinner tick. Older `spinnerVerbColor` settings still work as an alias. Custom verbs are persisted as `spinnerVerbs` and `spinnerVerbMode` and picked up at the next turn start. When both project and user spinner settings exist, project settings apply first and user settings second.

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

`messageStyle: "claude"` trims leading and trailing blank render lines, collapses paragraph gaps, and aligns wrapped assistant and thinking lines under the message body, matching Claude Code's sparse transcript grammar. `messageStyle: "classic"` keeps the previous package behavior.

#### Custom worked verbs

Each finished turn is named with a past-tense verb, like `✻ Cooked for 8s` or `✻ Sautéed for 11s`. One is picked per turn and stays stable across repaints. You can supply your own:

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

`append` (the default) merges your verbs into the built-in pool, and `replace` draws only from yours. An empty list always falls back to the built-ins, so a bad config cannot leave the worked line verbless. This one is a deliberate departure from Claude Code, which has no such setting.

### Tool background modes

| Value | Behavior |
|-------|----------|
| `default` | Standard pi tool backgrounds |
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
| `opencode` | Compact status while collapsed, with a `Ctrl+O` hint for output preview on raw shell commands. Semantic read-only bash rows omit the repeated hint to stay closer to Claude Code. |
| `summary` | Status only, with no output preview or expansion hint |
| `preview` | Show a small output preview even while collapsed |

### Boolean settings

| Setting | Default | Description |
|---------|---------|-------------|
| `bashStackConsecutive` | `true` | Remove the extra spacer between adjacent bash tool rows so command bursts render as a tight stack |
| `bashSemanticDisplay` | `true` | Render common read-only shell file-inspection commands as semantic `Read` rows instead of raw `Bash` rows |
| `readOnlyToolGrouping` | `true` | Aggregate adjacent read-only tools (`read`/`grep`/`find`/`ls`/`bash`) under one gerund header that collapses to a dim past-tense summary once they settle; mutating `write`/`edit`/`apply_patch` rows stay independent |

### Numeric settings

| Setting | Default | Description |
|---------|---------|-------------|
| `previewLines` | `8` | Lines shown in collapsed preview mode |
| `expandedPreviewMaxLines` | `4000` | Max lines when fully expanded |
| `bashCollapsedLines` | `10` | Lines for collapsed bash output |
| `diffCollapsedLines` | `24` | Diff lines before collapsing |
| `readOnlyToolGroupLimit` | `5` | Max inspection entries shown inside a grouped read-only tool block |

## Notes

This package targets recent pi versions where tool renderers use:

- `renderCall(args, theme, context)`
- `renderResult(result, { expanded, isPartial }, theme, context)`

Unknown and custom tools do not have a public global renderer hook in pi, so this package patches container rendering to add top and bottom borders for all tool executions in border mode.

## Credits

This project would not exist without the people whose work it builds on:

- **Moeeze Hassan ([FammasMaz](https://github.com/FammasMaz))**, who wrote [pi-cc-tools](https://github.com/FammasMaz/pi-cc-tools), the project this one was forked from. The bones of the tool renderers are his.
- **[@heyhuynhgiabuu/pi-pretty](https://github.com/buddingnewinsights/pi-pretty)** by [huynhgiabuu](https://github.com/buddingnewinsights): pretty terminal output with syntax-highlighted file reads, colored bash output, and tree-view directory listings
- **[@heyhuynhgiabuu/pi-diff](https://github.com/buddingnewinsights/pi-diff)** by [huynhgiabuu](https://github.com/buddingnewinsights): Shiki-powered terminal diff renderer with word-level diffs in split and unified views
- **[pi-tool-display](https://github.com/MasuRii/pi-tool-display)** by [MasuRii](https://github.com/MasuRii): compact tool call rendering, diff visualization, and output truncation
