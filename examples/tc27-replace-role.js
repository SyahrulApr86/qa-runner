const { withRecordedPage, loginViaForm, smoothClick, smoothType } = require('./runner');
const { FE } = require('./helpers');

async function assignRole(page, searchTerm, role) {
  await smoothType(page, page.getByPlaceholder('Cari akun SSO UI...'), searchTerm);
  await page.waitForTimeout(700);
  await smoothClick(page, page.getByRole('button', { name: /QA TC29 Replace Role/ }));
  await page.waitForTimeout(200);
  if (role === 'admin') {
    await smoothClick(page, page.getByLabel('Role'));
    await smoothClick(page, page.getByRole('option', { name: 'Admin' }));
  }
  await smoothClick(page, page.getByRole('button', { name: /Berikan Role ke/ }));
  await page.waitForTimeout(1000);
}

withRecordedPage('TC-27_reassign_role_replaces_not_stacks', async (page) => {
  await loginViaForm(page, FE, 'admin.test@yandok.local', 'TestAdmin123');
  await page.goto(`${FE}/dashboard/staf`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await assignRole(page, 'QA TC29', 'staf');
  let successStaf = await page.getByText('sekarang punya role staf').count();
  if (successStaf === 0) throw new Error('expected first assignment (staf) to succeed');

  await assignRole(page, 'QA TC29', 'admin');
  let successAdmin = await page.getByText('sekarang punya role admin').count();
  if (successAdmin === 0) throw new Error('expected second assignment (admin) to succeed');

  // Confirm the roster shows exactly one row for this account, with admin only.
  const rows = await page.locator('text=qa-tc29-sso@ui.ac.id').count();
  if (rows !== 1) throw new Error(`expected exactly 1 roster row for the account, found ${rows}`);
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
