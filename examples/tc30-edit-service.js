const { withRecordedPage, loginViaForm, smoothClick, smoothType } = require('./runner');
const { FE, apiLogin, apiCreateService, apiDeleteService } = require('./helpers');

const ORIGINAL_NAME = `QA Edit Original ${Date.now()}`;
const NEW_NAME = `QA Edit Updated ${Date.now()}`;
let serviceId;

withRecordedPage('TC-30_staf_edit_service', async (page) => {
  const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
  const created = await apiCreateService(login.access_token, { name: ORIGINAL_NAME });
  serviceId = created.id;

  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await page.goto(`${FE}/staf/services`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Row buttons in DOM order: [0] toggle status, [1] toggle expand syarat
  // unggah, [2] edit (pencil), [3] delete (trash) -- see ServiceCatalogTable.vue.
  const row = page.locator('tr', { has: page.getByText(ORIGINAL_NAME) });
  await smoothClick(page, row.locator('button').nth(2));
  await page.waitForTimeout(500);

  const nameInput = page.getByPlaceholder('Contoh: Legalisasi Ijazah');
  await nameInput.fill('');
  await smoothType(page, nameInput, NEW_NAME);
  await smoothClick(page, page.getByRole('button', { name: 'Simpan Perubahan' }));
  await page.waitForTimeout(1200);

  const success = await page.getByText('berhasil disimpan').count();
  if (success === 0) throw new Error('expected success message after editing a service');
  const renamed = await page.getByText(NEW_NAME).count();
  if (renamed === 0) throw new Error('expected updated name to appear in the catalog table');
}).then(async (r) => {
  if (serviceId) {
    const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
    await apiDeleteService(login.access_token, serviceId);
  }
  process.exit(r.status === 'PASS' ? 0 : 1);
});
