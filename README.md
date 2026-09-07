# qa-runner

Playwright-based end-to-end QA recording infrastructure: drives a real browser through an app's flows and produces one mp4 video per test case, with a visible moving cursor so the recording is easy to follow.

Extracted from a real project's QA work. `runner.js` and the connection constants in `helpers.js` are generic; everything else (the `examples/` scripts, the app-specific functions in `helpers.js`) is a worked example against one specific app and needs adapting to whatever app you point this at.

If you're driving this with a Claude Code agent, feed it [`SKILL.md`](./SKILL.md) (it's a Claude Code skill file): it describes the workflow (discover flows, get sign-off, record, hard rule on never scripting real credentials) so the agent doesn't have to be re-briefed on the whole approach every time.

## What's reusable vs. what's an example

| File | Status |
|---|---|
| `runner.js` (`withRecordedPage`, `smoothClick`, `smoothType`, `showEmailInMailhog`) | Reusable pattern. `gotoReady`'s error-retry text, `fieldSelect`, `loginViaForm`'s selectors are tied to one app's markup, adapt them. |
| `helpers.js` (`psql`, `mailhogLatestLink`, `FE`/`BE`/`DB_URL`/`MAILHOG` constants) | Reusable pattern. |
| `helpers.js` (`apiRegister`, `apiCreateService`, `deleteTestUsers`, etc.) | Example only, tied to one app's API routes and DB schema. Rewrite for your app. |
| `cursor.js` | Reusable as-is (injects a visible cursor dot + click ripple). |
| `examples/*.js` | Example test scripts showing the pattern end to end. Not meant to run against your app unmodified. |

## Setup

```bash
npm install
npx playwright install chromium
```

Configure via environment variables (or a `.env` file, not committed):

```bash
QA_FRONTEND_URL=http://localhost:3001
QA_BACKEND_URL=http://localhost:3000
QA_DATABASE_URL=postgres://user:pass@localhost:5432/yourdb
MAILHOG_URL=http://localhost:8025
QA_VIDEO_DIR=/path/to/output/folder   # defaults to ./qa-videos
```

## Writing a test case

```js
const { withRecordedPage, loginViaForm, smoothClick, smoothType, gotoReady } = require('./runner');
const { FE, apiRegister } = require('./helpers');

withRecordedPage('TC-01_some_flow', async (page) => {
  await gotoReady(page, `${FE}/some-page`);
  await smoothClick(page, page.getByRole('button', { name: 'Do the thing' }));
  // assertions: throw an Error to mark the case FAIL, video is still saved either way
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
```

Run it: `node your-test-case.js`. The video lands in `QA_VIDEO_DIR` (or `./qa-videos`) as `<name>.mp4`.

## Conventions worth keeping

- **One video per scenario**, start to finish, not fragmented per-click clips.
- **~2 second pause** after every page navigation (`gotoReady` already does this) so the recording is actually watchable, not a blur.
- **MailHog flows should visit the MailHog UI on camera** (`showEmailInMailhog`) instead of silently fetching the verification link via API and jumping straight to the result.
- **Test data via API/registration, never real accounts.** Every example script creates its own throwaway account and cleans it up in `.then()`.
- **Never type a real human's password into any automation script, for any reason** — not even "a test account someone made for this." If a flow needs a third-party login (SSO, OAuth) that can't be scripted with a disposable account, skip it and note that it needs manual testing. This was a hard lesson from the project this was extracted from: a script with a real password sitting in a repo is a standing liability, automated or not.
- Keep recorded videos and scripts **out of the target app's own git repo** — separate folder, separate concern.

## Merging clips into one video with subtitles

Useful for a single "everything" walkthrough:

```bash
# build a concat list (natural TC order) and an SRT with each segment's filename as a subtitle,
# then either mux it as a soft subtitle track or burn it in with ffmpeg's subtitles filter.
```

See git history / ask the person who set this up for the exact script if you need it; it's a straightforward ffprobe-duration + concat-demuxer + subtitles-filter pipeline, not included here since it's a one-off convenience rather than core infra.
