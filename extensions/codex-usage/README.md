# Codex Usage

Codex Usage adds an OpenUsage-inspired popup to Ghostex for the live Codex
five-hour, weekly, Spark, and Spark Weekly limits. It also shows flex credits,
rate-limit resets, a 30-day token trend, and Today, Yesterday, and Last 30 Days
token and estimated-cost totals. When pinned, the titlebar button shows the
five-hour and weekly percentages compactly on its first line (for example,
`12/34%`) and the available reset count on its second (`2 rs`).

## Setup

Sign in with the Codex CLI. The extension reads the existing OAuth credential
from `$CODEX_HOME/auth.json`, or from `~/.config/codex/auth.json` and then
`~/.codex/auth.json` when `CODEX_HOME` is unset. API-key-only authentication
cannot access ChatGPT subscription usage.

The extension refreshes OAuth credentials shortly before expiry and writes the
rotated tokens back to the same auth file. It never prints or serves tokens.
Live usage refreshes every 60 seconds from the Codex usage endpoint, and HTTP
429 responses honor `Retry-After`.

Local usage is scanned incrementally from the Codex CLI's `sessions/` and
`archived_sessions/` JSONL rollouts. Replayed child-session history and repeated
cumulative token snapshots are excluded before daily totals are calculated.
Dollar values are local estimates using the Codex-relevant OpenUsage pricing
snapshot recorded in `THIRD_PARTY_NOTICES.md`; token counts come directly from
the rollout logs.

## Permissions

- `network`: fetches usage data from ChatGPT and refreshes Codex OAuth tokens.
  The command server also posts its two badge lines to the scoped local Ghostex
  API.

The Status and Dashboard buttons are ordinary HTTPS links. The popup contains
no external scripts, styles, fonts, remote imports, or downloaded executable
code. OpenUsage informed the OAuth and usage-window behavior; its icon license
is recorded in `THIRD_PARTY_NOTICES.md`.

## Development

The server uses only Node.js built-ins and the built-in `fetch` implementation.
Keep `src/server.mjs` and `dist/server.mjs` byte-identical; `server.mjs` is the
small launcher used by the manifest and the phase self-test.

```sh
cp src/server.mjs dist/server.mjs
node --check server.mjs
node server.mjs --port 4599 --once
```
