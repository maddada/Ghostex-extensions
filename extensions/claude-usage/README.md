# Claude Usage

Claude Usage adds an OpenUsage-inspired popup to Ghostex. It shows the live
Claude Session and Weekly limits, the busiest weekly-scoped model, reset times,
Extra Usage, a 14-day token sparkline, and Today, Yesterday, and Last 30 Days
local usage tiles. When pinned, its titlebar badge shows the Weekly and top-model
percentages while the popup is closed.

## Setup

Sign in with Claude Code. The extension reads the existing OAuth credential from
the macOS Keychain service `Claude Code-credentials`, then
`~/.claude/.credentials.json` if the Keychain item is unavailable. It never
prints or serves the token. If the credential is missing, expired, or rejected,
the popup asks you to re-login in Claude Code.

Live limit data refreshes every 60 seconds from Anthropic's OAuth usage endpoint.
HTTP 429 responses honor `Retry-After`. Local usage comes from an incremental
scan of `~/.claude/projects/**/*.jsonl`, deduplicated by message and request id.
Token totals are always shown. Dollar totals appear only for log entries that
already contain `costUSD`; this extension does not include or download pricing
tables.

## Permissions

- `network`: fetches usage data from `api.anthropic.com`. The command server
  also posts its two badge lines to the scoped local Ghostex API.

The Status and Dashboard buttons are ordinary HTTPS links. The popup contains
no external scripts, styles, fonts, remote imports, or downloaded executable
code.

## Development

The server uses only Node.js built-ins and the built-in `fetch` implementation.
Keep `src/server.mjs` and `dist/server.mjs` byte-identical; `server.mjs` is the
small launcher used by the manifest and the phase self-test.

```sh
cp src/server.mjs dist/server.mjs
node --check server.mjs
node server.mjs --port 4599 --once
```
