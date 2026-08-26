const { withRecordedPage, loginViaForm, smoothClick, smoothType } = require('./runner');
const { FE } = require('./helpers');

withRecordedPage('TC-24_admin_search_and_assign_role', async (page) => {
  await loginViaForm(page, FE, 'admin.test@yandok.local', 'TestAdmin123');
  await page.goto(`${FE}/dashboard/staf`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await smoothType(page, page.getByPlaceholder('Cari akun SSO UI...'), 'QA TC26');
  await page.waitForTimeout(700);
  await smoothClick(page, page.getByRole('button', { name: /QA TC26 Provision Target/ }));
  await page.waitForTimeout(300);

  await smoothClick(page, page.getByRole('button', { name: /Berikan Role ke/ }));
  await page.waitForTimeout(1000);

  const success = await page.getByText('sekarang punya role staf').count();
  if (success === 0) throw new Error('expected success message after assigning role');
  const inRoster = await page.getByText('qa-tc26-sso@ui.ac.id').count();
  if (inRoster === 0) throw new Error('expected new account to appear in roster after assignment');
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
