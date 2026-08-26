const { withRecordedPage, loginViaForm, gotoReady } = require('./runner');
const { FE } = require('./helpers');

withRecordedPage('TC-21_staf_denied_admin_only_page', async (page) => {
  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await page.waitForURL('**/dashboard');

  await gotoReady(page, `${FE}/dashboard/staf`);
  await page.waitForTimeout(500);
  const denied = await page.getByText('Halaman ini khusus admin').count();
  if (denied === 0) throw new Error('expected "khusus admin" message for staf on Kelola Staf page');

  const navHasKelolaStaf = await page.getByRole('link', { name: 'Kelola Staf' }).count();
  if (navHasKelolaStaf > 0) throw new Error('Kelola Staf link should not appear in nav for staf role');
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
