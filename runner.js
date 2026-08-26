const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const VIDEO_DIR = path.join(__dirname, '_raw');
// Override with QA_VIDEO_DIR to point at a project-specific output folder
// kept outside the target app's own repo (see README).
const FINAL_DIR = process.env.QA_VIDEO_DIR || path.join(process.cwd(), 'qa-videos');
fs.mkdirSync(VIDEO_DIR, { recursive: true });
fs.mkdirSync(FINAL_DIR, { recursive: true });

async function withRecordedPage(tcName, fn) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1920, height: 1080 } }
  });
  await context.addInitScript({ path: path.join(__dirname, 'cursor.js') });
  const page = await context.newPage();

  let status = 'PASS';
  let note = '';
  try {
    await fn(page, context);
  } catch (err) {
    status = 'FAIL';
    note = String(err.message || err).split('\n')[0];
    console.error(`[${tcName}] ERROR:`, note);
  }

  const video = page.video();
  await context.close();
  await browser.close();

  // Chromium only records to webm; convert to mp4 (H.264) here so every
  // video in the output folder is directly playable/shareable without
  // relying on webm codec support.
  let finalPath = null;
  if (video) {
    const rawPath = await video.path();
    finalPath = path.join(FINAL_DIR, `${tcName}.mp4`);
    execFileSync('ffmpeg', ['-y', '-i', rawPath, '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', finalPath, '-loglevel', 'error']);
    fs.unlinkSync(rawPath);
  }

  console.log(`[${tcName}] ${status} ${note} -> ${finalPath}`);
  return { status, note, video: finalPath };
}

// Moves the mouse in a few intermediate steps toward the element before
// clicking, so the cursor overlay shows real travel instead of a single
// teleport jump (Playwright's own .click() only dispatches one mousemove
// at the target).
async function smoothClick(page, locator, opts = {}) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('element not visible for smoothClick');
  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(targetX - (targetX * (steps - i)) / steps * 0.3, targetY, { steps: 1 });
    await page.waitForTimeout(15);
  }
  await page.mouse.move(targetX, targetY, { steps: 5 });
  await page.waitForTimeout(150);
  await locator.click(opts);
}

async function smoothType(page, locator, text) {
  await locator.click();
  await page.waitForTimeout(100);
  await locator.pressSequentially(text, { delay: 45 });
}

// The helpers below (gotoReady's 500-retry text, fieldSelect, loginViaForm's
// placeholders/button text) were written against one specific app's markup.
// Keep the pattern, but re-point the selectors and error text at your own
// app before reusing them; see README for what's generic vs. what to adapt.

// Nuxt pages are SSR + hydrated client-side: filling a field immediately
// after goto() races Vue's hydration and the v-model reset wins, silently
// clearing whatever was just typed. Always settle on networkidle (+ a
// short buffer for hydration to finish attaching) before interacting.
async function gotoReady(page, url) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Nuxt's dev server occasionally races itself compiling a route a real
  // browser is hitting for the very first time (concurrent SSR renders of
  // an uncompiled module), surfacing a transient 500 "X is not defined".
  // A second real navigation always succeeds once the module is compiled.
  const is500 = await page.getByText('Internal Server Error').count().catch(() => 0);
  if (is500 > 0) {
    await page.waitForTimeout(500);
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
  }
}

// Nuxt UI's USelectMenu button carries aria-label="Show popup", not the
// field's label text, so getByRole('combobox', {name}) can't find it.
// Locate it via the UFormField wrapper div instead, which does contain
// the label text.
function fieldSelect(page, label) {
  return page.locator('div[data-orientation="vertical"]').filter({ hasText: label }).locator('button').first();
}

// Visits the MailHog inbox, searches for the given recipient, and opens the
// newest matching message, so the video actually shows checking email
// instead of jumping straight from "submit" to "verified" with nothing in
// between. The link itself is still fetched via mailhogLatestLink() for
// reliability (MailHog renders the email body in an iframe, which is
// fragile to click into); this just gives the browsing motion on camera.
async function showEmailInMailhog(page, toEmail) {
  await page.goto(process.env.MAILHOG_URL || 'http://localhost:8025');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await smoothType(page, page.locator('#search'), toEmail);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await smoothClick(page, page.locator('.msglist-message').first());
  await page.waitForTimeout(2500);
}

async function loginViaForm(page, feBase, email, password) {
  await gotoReady(page, `${feBase}/login`);
  await smoothType(page, page.getByPlaceholder('nama@contoh.com'), email);
  await smoothType(page, page.getByPlaceholder('Password Anda'), password);
  await smoothClick(page, page.getByRole('button', { name: 'Masuk', exact: true }));
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 10000 });
  await page.waitForTimeout(2000);
}

// Seeds an authenticated session directly via cookies (skipping the login
// UI), for test cases that focus on a later step (profile wizard, RBAC
// pages) rather than the login flow itself. The `user` cookie must be
// URL-encoded: raw JSON contains characters invalid in a cookie value, and
// Playwright's addCookies silently accepts it while the browser fails to
// actually store it, leaving `isAuthenticated` false with no error.
async function seedSession(context, loginResult) {
  await context.addCookies([
    { name: 'access_token', value: loginResult.access_token, domain: 'localhost', path: '/' },
    { name: 'refresh_token', value: loginResult.refresh_token, domain: 'localhost', path: '/' },
    { name: 'user', value: encodeURIComponent(JSON.stringify(loginResult.user)), domain: 'localhost', path: '/' }
  ]);
}

module.exports = { withRecordedPage, smoothClick, smoothType, gotoReady, loginViaForm, seedSession, fieldSelect, showEmailInMailhog };
