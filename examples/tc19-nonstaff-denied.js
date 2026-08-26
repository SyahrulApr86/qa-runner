const { withRecordedPage, loginViaForm, gotoReady } = require('./runner');
const { FE } = require('./helpers');

withRecordedPage('TC-19_non_staff_denied_staff_pages', async (page) => {
  await loginViaForm(page, FE, 'e2e-mitra@yandok.local', 'QaTest1234');
  await page.waitForURL('**/dashboard');

  await gotoReady(page, `${FE}/staf/services`);
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
