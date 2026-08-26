const { withRecordedPage, smoothClick, loginViaForm } = require('./runner');
const { FE } = require('./helpers');

withRecordedPage('TC-04_refresh_token_also_expired_redirects_login', async (page) => {
  await loginViaForm(page, FE, 'admin.test@yandok.local', 'TestAdmin123');
  await page.waitForURL('**/dashboard');

  // Both tokens corrupted: refresh must fail too, forcing a real logout.
  await page.evaluate(() => {
    document.cookie = 'access_token=garbage.invalid.token; path=/';
    document.cookie = 'refresh_token=garbage.invalid.refresh; path=/';
  });

  await smoothClick(page, page.getByRole('link', { name: 'Kelola Pengumuman' }));
  await page.waitForURL('**/login**', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const message = await page.getByText('Sesi Anda telah berakhir').count();
  if (message === 0) throw new Error('expected session-expired message on login page');
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
