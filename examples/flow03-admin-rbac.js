const { withRecordedPage, loginViaForm, smoothClick, smoothType } = require('./runner');
const { FE, insertSSOUser, deleteTestUsers } = require('./helpers');

const TS = Date.now();
const EMAIL_A = `qa-flow-rbac-a-${TS}@ui.ac.id`;
const EMAIL_B = `qa-flow-rbac-b-${TS}@ui.ac.id`;
const EMAIL_C = `qa-flow-rbac-c-${TS}@ui.ac.id`;
const NAME_A = `QA Flow RBAC Alpha ${TS}`;
const NAME_B = `QA Flow RBAC Beta ${TS}`;
const NAME_C = `QA Flow RBAC Gamma ${TS}`;

withRecordedPage('FLOW-03_admin_kelola_staf_rbac', async (page) => {
  insertSSOUser(EMAIL_A, NAME_A);
  insertSSOUser(EMAIL_B, NAME_B);
  insertSSOUser(EMAIL_C, NAME_C);

  // 1. Login sebagai admin
  await loginViaForm(page, FE, 'admin.test@yandok.local', 'TestAdmin123');

  // 2. Buka Kelola Staf
  await smoothClick(page, page.getByRole('link', { name: 'Kelola Staf' }));
  await page.waitForURL('**/dashboard/staf**', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // 3. Cari & beri role staf ke satu akun SSO
  await smoothType(page, page.getByPlaceholder('Cari akun SSO UI...'), NAME_A);
  await page.waitForTimeout(2000);
  await smoothClick(page, page.getByRole('button', { name: new RegExp(NAME_A) }));
  await page.waitForTimeout(500);
  await smoothClick(page, page.getByRole('button', { name: /Berikan Role ke/ }));
  await page.waitForTimeout(2000);

  let success = await page.getByText('sekarang punya role staf').count();
  if (success === 0) throw new Error('expected success message after assigning staf role');

  // 4. Reassign akun yang sama jadi admin (ganti, bukan numpuk)
  await smoothType(page, page.getByPlaceholder('Cari akun SSO UI...'), NAME_A);
  await page.waitForTimeout(2000);
  await smoothClick(page, page.getByRole('button', { name: new RegExp(NAME_A) }));
  await page.waitForTimeout(500);
  await smoothClick(page, page.getByLabel('Role'));
  await smoothClick(page, page.getByRole('option', { name: 'Admin' }));
  await smoothClick(page, page.getByRole('button', { name: /Berikan Role ke/ }));
  await page.waitForTimeout(2000);

  success = await page.getByText('sekarang punya role admin').count();
  if (success === 0) throw new Error('expected success message after reassigning to admin role');

  const rows = await page.locator(`text=${EMAIL_A}`).count();
  if (rows !== 1) throw new Error(`expected exactly 1 roster row for the reassigned account, found ${rows}`);

  // 5. Beri role staf ke dua akun sekaligus
  await smoothType(page, page.getByPlaceholder('Cari akun SSO UI...'), NAME_B);
  await page.waitForTimeout(2000);
  await smoothClick(page, page.getByRole('button', { name: new RegExp(NAME_B) }));
  await page.waitForTimeout(500);

  await smoothType(page, page.getByPlaceholder('Cari akun SSO UI...'), NAME_C);
  await page.waitForTimeout(2000);
  await smoothClick(page, page.getByRole('button', { name: new RegExp(NAME_C) }));
  await page.waitForTimeout(500);

  await smoothClick(page, page.getByRole('button', { name: /Berikan Role ke 2 Akun/ }));
  await page.waitForTimeout(2000);

  const bInRoster = await page.getByText(EMAIL_B).count();
  const cInRoster = await page.getByText(EMAIL_C).count();
  if (bInRoster === 0 || cInRoster === 0) throw new Error('expected both accounts to appear in roster after multi-assign');

  // 6. Logout
  await smoothClick(page, page.getByRole('button', { name: 'Admin Test' }));
  await page.waitForTimeout(500);
  await smoothClick(page, page.getByText('Keluar', { exact: true }));
  await page.waitForURL((u) => !u.pathname.includes('/dashboard'), { timeout: 10000 });
  await page.waitForTimeout(2000);
}).then((r) => {
  deleteTestUsers([EMAIL_A, EMAIL_B, EMAIL_C]);
  process.exit(r.status === 'PASS' ? 0 : 1);
});
