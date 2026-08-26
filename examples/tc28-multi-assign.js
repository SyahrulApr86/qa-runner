const { withRecordedPage, loginViaForm, smoothClick, smoothType } = require('./runner');
const { FE } = require('./helpers');

withRecordedPage('TC-28_multi_assign_roles_at_once', async (page) => {
  await loginViaForm(page, FE, 'admin.test@yandok.local', 'TestAdmin123');
  await page.goto(`${FE}/dashboard/staf`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await smoothType(page, page.getByPlaceholder('Cari akun SSO UI...'), 'QA TC30 Multi');
  await page.waitForTimeout(700);
  await smoothClick(page, page.getByRole('button', { name: /QA TC30 Multi Alpha/ }));
  await page.waitForTimeout(200);

  await smoothType(page, page.getByPlaceholder('Cari akun SSO UI...'), 'QA TC30 Multi');
  await page.waitForTimeout(700);
  await smoothClick(page, page.getByRole('button', { name: /QA TC30 Multi Beta/ }));
  await page.waitForTimeout(200);

  const submitLabel = await page.getByRole('button', { name: /Berikan Role ke 2 Akun/ }).count();
  if (submitLabel === 0) throw new Error('expected submit button to say "Berikan Role ke 2 Akun" with two tags selected');

  await smoothClick(page, page.getByRole('button', { name: /Berikan Role ke 2 Akun/ }));
  await page.waitForTimeout(1200);

  const aInRoster = await page.getByText('qa-tc30-sso-a@ui.ac.id').count();
  const bInRoster = await page.getByText('qa-tc30-sso-b@ui.ac.id').count();
  if (aInRoster === 0 || bInRoster === 0) throw new Error('expected both accounts to appear in roster after multi-assign');
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
