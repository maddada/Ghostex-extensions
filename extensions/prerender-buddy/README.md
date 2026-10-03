# Prerender Buddy

Open your [Prerender Buddy](https://prerenderbuddy.com/) workspace as a full
Ghostex view beside your agent. Review what AI answers say about your brand,
check what crawlers can read, and prepare articles from relevant findings while
you work on your website.

This extension uses Ghostex's supported URL-view format. It opens the hosted
PB application directly at <https://app.prerenderbuddy.com/>. It ships no local
runtime code and starts no background process.

## What you can do

- Review recorded AI answers, brand mentions, recommendations, competitors,
  and cited sources for your tracked questions.
- Inspect website health, crawler activity, rendering usage, and discovery-file
  findings for your websites.
- Ask Buddy to explain your available evidence and suggested next steps.
- Review article ideas, prepare proposals, and generate drafts using your PB
  allowance. Approve and publish articles through a configured supported CMS
  connection using PB's existing review and confirmation flow.

The view displays your own workspace data. Availability depends on your PB plan,
permissions, and the tracking, monitoring, or publishing you have configured.
Recorded AI answers are samples; crawler visits do not establish an AI mention
or citation.

## Setup

1. Install **Prerender Buddy** from Ghostex's extension store.
2. Open it from the extensions menu. You can pin its icon for quicker access.
3. Sign in with your normal Prerender Buddy account. If you are new to PB,
   create an account from the sign-in screen.
4. Select your workspace and website. New accounts can add their website and
   set up tracking inside PB.

No Developer API key is required for this web view. Your existing subscription,
feature permissions, and workspace allowances apply; installing the extension
does not purchase a plan or start article generation.

You may need to sign in in Ghostex even if you are already signed in in your
external browser. Authentication uses PB's normal hosted sign-in flow. Sign out
through the account menu inside PB when needed. Removing the extension does not
delete your PB account or workspace.

## Agent access

Opening this view does not automatically grant the agent access to your account
or install an MCP server. To use PB tools in an agent conversation, configure
PB's MCP connection separately in your chosen agent. Start with
[PB's workspace MCP guide](https://prerenderbuddy.com/docs/workspace-mcp); MCP authentication,
permissions, and plan requirements are separate from this web view.

## Preferences

There are no extension-specific preferences. Manage websites, tracking,
monitoring, theme, and publishing inside the PB application. Widen the Ghostex
view when working with larger result tables.

## Permissions and data

- **`network`**: required to load the hosted PB application, its authentication,
  and its service APIs over HTTPS.

The extension does not request `exec`, `cli`, `ssh`, or `clipboard` permissions.
It does not read local project files, run terminal commands, or receive agent
conversations or project context through Ghostex's extension bridge.

Sign-in and workspace actions are handled by the hosted PB application and its
normal service providers, rather than a local extension server. PB's
[privacy policy](https://prerenderbuddy.com/privacy) applies to that service.

## Troubleshooting

- **Sign-in page:** sign in to PB; the app entry URL returns you to your workspace
  after authentication. If verification is requested, complete PB's normal
  account verification flow.
- **No AI results:** add tracked questions and complete visibility setup in PB.
  Existing accounts may be waiting for the next scheduled collection; opening
  this extension does not trigger a collection.
- **No publishing destination:** connect a supported CMS in PB's publishing
  settings before attempting delivery.
- **Cannot load the view:** check your connection and try the same app URL in
  your browser. The hosted application must be reachable for this extension to
  work.

## Development and review

This is a `server.url` extension, so there is no `src/`, `dist/`, dependency
installation, or build step. The installable payload consists of the manifest,
SVG icon, README, and changelog. Review includes the hosted destination site.

From the repository root:

```sh
node tooling/validate.mjs
node tooling/build-catalog.mjs
```

For a native smoke test, open the extension in Ghostex, verify sign-in and
navigation in the full view, then close and reopen it. Check both PB themes and
narrower view widths. The extension declares only the `view` placement.

## Links and support

- Website: <https://prerenderbuddy.com/>
- Application: <https://app.prerenderbuddy.com/>
- Documentation: <https://prerenderbuddy.com/docs>
- Pricing: <https://prerenderbuddy.com/pricing>
- Support: <support@prerenderbuddy.com>
