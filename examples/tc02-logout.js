const { withRecordedPage, smoothClick, loginViaForm, gotoReady } = require('./runner');
const { FE } = require('./helpers');

withRecordedPage('TC-02_logout_clears_session', async (page) => {
  await loginViaForm(page, FE, 'admin.test@yandok.local', 'TestAdmin123');
  await page.waitForURL('**/dashboard');

  await smoothClick(page, page.getByRole('button', { name: 'Admin Test' }));
  await page.waitForTimeout(400);
  await smoothClick(page, page.getByText('Keluar', { exact: true }));
  await page.waitForURL((u) => !u.pathname.includes('/dashboard'), { timeout: 10000 });
  await page.waitForTimeout(2000);

  // confirm session really cleared: going back to dashboard bounces to login
  await gotoReady(page, `${FE}/dashboard`);
  await page.waitForURL('**/login');
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
