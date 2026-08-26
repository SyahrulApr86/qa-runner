const { withRecordedPage, loginViaForm, smoothClick } = require('./runner');
const { FE, apiLogin, apiCreateService } = require('./helpers');

const NAME = `QA Delete Target ${Date.now()}`;

withRecordedPage('TC-31_staf_delete_service', async (page) => {
  const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
  await apiCreateService(login.access_token, { name: NAME });

  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await page.goto(`${FE}/staf/services`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const row = page.locator('tr', { has: page.getByText(NAME) });
  await smoothClick(page, row.locator('button').nth(3));
  await page.waitForTimeout(400);
  await smoothClick(page, page.getByRole('button', { name: /^Hapus$/ }));
  await page.waitForTimeout(1200);

  const stillThere = await page.getByText(NAME).count();
  if (stillThere > 0) throw new Error('expected service to be removed from the catalog table after delete');
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
