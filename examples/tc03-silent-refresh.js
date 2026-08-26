const { withRecordedPage, smoothClick, loginViaForm, gotoReady } = require('./runner');
const { FE } = require('./helpers');

withRecordedPage('TC-03_silent_token_refresh_on_expiry', async (page) => {
  await loginViaForm(page, FE, 'admin.test@yandok.local', 'TestAdmin123');
  await page.waitForURL('**/dashboard');

  // Simulate an expired access token by corrupting the cookie value directly,
  // while the refresh token stays valid.
  await page.evaluate(() => {
    document.cookie = 'access_token=garbage.invalid.token; path=/';
  });

  await smoothClick(page, page.getByRole('link', { name: 'Kelola Layanan' }));
  await page.waitForURL('**/staf/services');
  await page.waitForTimeout(2000);

  // If the silent refresh worked, the catalog page loaded data with no
  // error banner, and we're still on /staf/services (not bounced to login).
  const errorBanner = await page.getByText('Gagal memuat katalog layanan').count();
  if (errorBanner > 0) throw new Error('expected silent refresh, but raw error banner is shown');
  if (!page.url().includes('/staf/services')) throw new Error('expected to remain on /staf/services after silent refresh');
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
