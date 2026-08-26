const { withRecordedPage, smoothClick, gotoReady } = require('./runner');
const { FE } = require('./helpers');

// Full Google OAuth completion needs a real Google account and cannot be
// automated here (never type a real user's credentials). This verifies
// only that clicking the button correctly initiates the redirect to
// Keycloak with the google idp hint, matching /api/v1/auth/google.
withRecordedPage('TC-12_google_login_button_redirect', async (page) => {
  await gotoReady(page, `${FE}/login`);
  await smoothClick(page, page.getByRole('button', { name: 'Masuk dengan Google' }));
  await page.waitForURL((u) => u.hostname !== 'localhost' || u.pathname.includes('/realms/'), { timeout: 15000 });
  const url = page.url();
  if (!url.includes('kc_idp_hint=google') && !url.includes('accounts.google.com')) {
    throw new Error(`expected redirect toward Google/Keycloak idp, got: ${url}`);
  }
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
