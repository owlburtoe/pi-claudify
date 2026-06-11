# pi-claude-style-tools

Claude Code inspired tool rendering for Pi — Shiki-powered diffs, status dots, branch connectors, file icons, and configurable output modes.

## Features

- **Compact built-in tool rendering** for `read`, `bash`, `grep`, `find`, `ls`, `edit`, and `write`
- **Semantic bash display** that renders common read-only shell one-liners like `nl -ba file | sed -n '1,200p'` as Claude Code-style `Read file (lines 1-200)` rows
- **Claude-style OpenAI tool rendering** for `apply_patch` plus common Pi/OpenAI-style tools like `webfetch`, `web_search`, `fetch_content`, task tools, and context tools
- **`apply_patch` diff previews** that render parsed file patches in the call phase, similar to `edit`/`write`
- **Adaptive edit/write diffs** with split or unified layouts, syntax highlighting, and inline word-level emphasis
- **Diff stat bar** with colored add/remove summary and hunk metadata
- **Progressive collapsed diff hints** that shorten on narrow terminals
- **Thinking labels** during streaming and final messages, with context sanitization
- **Claude-style transcript grammar controls** for assistant/thinking prefixes, message spacing, hidden thinking labels, and active working tips
- **MCP-aware rendering** with hidden, summary, and preview modes
- **Configurable output modes** for read, search, bash, and MCP results
- **Transparent tool backgrounds** in `transparent` or `border` mode
- **Theme-adaptive palette** — borders, branch connectors, dim text, spinner accent, and diff backgrounds automatically follow the active pi theme (set `themeAdaptive: false` to keep the fixed Claude-style palette)
- **Transparent edit/write diffs** with universal red/green diff colors
- **Global border patch** for all tool rows, including unknown/custom tools

## Configuration

Set in `.pi/settings.json` or `~/.pi/settings.json`:

```json
{
  "toolBackground": "border",
  "readOutputMode": "preview",
  "searchOutputMode": "preview",
  "mcpOutputMode": "preview",
  "previewLines": 8,
  "bashOutputMode": "opencode",
  "bashCollapsedLines": 10,
  "bashStackConsecutive": true,
  "bashSemanticDisplay": true,
  "diffCollapsedLines": 24,
  "themeAdaptive": true,
  "diffTheme": "github-dark",
  "spinnerColor": "borderAccent",
  "spinnerVerbs": ["Reviewing", "Polishing"],
  "spinnerVerbMode": "append",
  "messageStyle": "claude",
  "assistantPrefix": "●",
  "thinkingPrefix": "✻",
  "messageSpacing": "comfortable",
  "workingTipEnabled": true,
  "workingTipText": "Run /install-github-app to tag @claude right from your GitHub issues and PRs",
  "hiddenThinkingLabel": "Pondering..."
}
```

### Theme integration

When `themeAdaptive` is `true` (default), the following colors are derived from the active pi theme on every render and re-derived whenever the theme changes:

| Element | Derived from |
|---------|--------------|
| Tool outline borders (top/bottom rules) | `borderMuted` |
| Branch connectors (`├─`, `└─`, `│`) | `dim` (fallback: `muted`) |
| "✻ Worked for Ns" line | `muted` |
| Thinking-block italic gray | `muted` |
| Diff add/remove accents | `toolDiffAdded` / `toolDiffRemoved` |
| Diff background tints | mixed against `toolSuccessBg` base |
| Spinner glyph + verb text (`✻ Working…`) | `borderAccent` (fallback: `accent`) |
| Spinner status text | `muted` |

User-supplied `diffTheme` presets and `diffColors` overrides always win over theme-derived defaults. File-type icons (e.g. `ts`, `py`, `rs`) keep their language-identity colors and are not theme-derived.

Set `themeAdaptive: false` to keep the original fixed Claude-style palette regardless of the active pi theme.

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
/cc-message assistant-prefix ●           # set assistant paragraph prefix
/cc-message thinking-prefix ✻            # set visible thinking prefix
/cc-message hidden-thinking-label Pondering...
/cc-message tip on                       # show active working tip line
/cc-message tip off                      # hide active working tip line
/cc-message tip text Run /help for tips   # set active working tip text
/cc-message reset                        # restore message chrome defaults
```

`messageStyle: "claude"` trims leading/trailing blank render lines, collapses paragraph gaps, and aligns wrapped assistant/thinking lines under the message body, matching Claude Code's sparse transcript grammar. `messageStyle: "classic"` keeps the previous package behavior. The active working tip is rendered as a subordinate `└─ Tip:` line under the spinner when supported by the Pi loader.

### Tool background modes

| Value | Behavior |
|-------|----------|
| `default` | Standard Pi tool backgrounds |
| `transparent` | Transparent tool backgrounds |
| `border` | Transparent backgrounds with top/bottom border lines |

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

### Numeric settings

| Setting | Default | Description |
|---------|---------|-------------|
| `previewLines` | `8` | Lines shown in collapsed preview mode |
| `expandedPreviewMaxLines` | `4000` | Max lines when fully expanded |
| `bashCollapsedLines` | `10` | Lines for collapsed bash output |
| `diffCollapsedLines` | `24` | Diff lines before collapsing |

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
