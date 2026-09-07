---
name: qa-video-testing
description: >-
  End-to-end QA testing of a web app with one recorded mp4 video per
  scenario, using a standalone Playwright script (not the playwright MCP
  plugin, whose video config only reloads on a full Claude Code restart).
  Use whenever the user asks to "test this website and show me a video",
  "record QA/demo videos of the app", "buat video demo semua fitur",
  "rekam pengetesan end-to-end", or wants visual proof that flows in a web
  app work, not just a pass/fail report.
---

# QA Video Testing

Drive a real browser through a web app's flows with Playwright, producing
one mp4 video per scenario with a visible moving cursor, and (when the
scenario asks for it) a written test-case list or docs to go with the
videos. This replaces an earlier MCP-plugin-based approach: that plugin's
video recording only reads its config at MCP-server-spawn time, so toggling
it requires a full Claude Code restart every time. A standalone Playwright
script (the `playwright` npm package, launched directly with
`chromium.launch()`) has no such restart gate and is the reliable way to do
this.

## Reference implementation

Don't build this from scratch. Clone or read
`https://github.com/SyahrulApr86/qa-runner` first: it has the runner
(`withRecordedPage`, `smoothClick`, `smoothType`, `gotoReady`,
`showEmailInMailhog`, automatic mp4 conversion via ffmpeg, a cursor-overlay
init script) plus worked example test scripts. Its README tells you which
parts are copy-paste-reusable versus which parts are examples tied to one
specific app that you need to re-point at whatever app you're testing
(selectors, login form fields, API routes, DB schema).

Adapt the pattern to the target app rather than importing the reference
repo's app-specific helpers verbatim.

## Record

One video per flow/scenario, start to finish (not fragmented per-click
clips). Conventions that make a recording actually watchable instead of a
blur:

- ~2 second pause after every page navigation.
- Cursor visibly moves to what it's about to click (`smoothClick`) and
  types character by character (`smoothType`), not instant `.click()`/
  `.fill()`.
- A step that waits on something external (email verification, a webhook,
  a queue) shows that thing on camera (e.g. actually open MailHog's inbox
  UI) instead of silently fetching the result via API and jumping straight
  to the outcome.
- 1920x1080, output mp4 (Chromium only records webm; convert with ffmpeg,
  see the reference runner).
- Videos and scripts live in a folder separate from the app's own repo,
  with a README/summary mapping scenario to video file and pass/fail
  status.

Docs (a generated user-manual/docs site from the recorded flows) is a
separate follow-on step if asked for, not assumed by default.

## When the user wants this on a different machine/project

Point them at (or have the agent clone) the reference repo above rather
than trying to hand-carry local files across machines: it's structured so
another agent can read the README, understand what's reusable versus
example, and write fresh scripts suited to that project.
