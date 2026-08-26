const path = require('path');
const { withRecordedPage, loginViaForm, smoothClick, gotoReady } = require('./runner');
const { FE, apiLogin, apiCreateService, apiDeleteService, apiAddCartItem, clearCustomerCart } = require('./helpers');

const NAME = `QA Upload Req ${Date.now()}`;
let serviceId;

withRecordedPage('TC-43_customer_upload_requirement_file', async (page) => {
  const stafLogin = await apiLogin('staf.test@yandok.local', 'TestStaf123');
  serviceId = (await apiCreateService(stafLogin.access_token, {
    name: NAME,
    uploadRequirements: [{ name: 'Scan KTP', allowed_extensions: ['PDF'], max_file_size_mb: 5, is_required: true }]
  })).id;
  const alumniLogin = await apiLogin('e2e-alumni@yandok.local', 'QaTest1234');
  await apiAddCartItem(alumniLogin.access_token, serviceId);

  await loginViaForm(page, FE, 'e2e-alumni@yandok.local', 'QaTest1234');
  await gotoReady(page, `${FE}/dashboard/cart`);
  await page.waitForTimeout(700);

  const card = page.locator('article', { has: page.getByText(NAME) }).first();
  await smoothClick(page, card.getByRole('button', { name: 'Lengkapi Persyaratan' }));
  await page.waitForTimeout(500);

  await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, 'test-upload.pdf'));
  await page.waitForTimeout(1200);

  const uploaded = await page.getByText('Terunggah').count();
  if (uploaded === 0) throw new Error('expected requirement to show as Terunggah after upload');
  const filenameShown = await page.getByText('test-upload.pdf').count();
  if (filenameShown === 0) throw new Error('expected uploaded filename to be shown');
}).then(async (r) => {
  clearCustomerCart('e2e-alumni@yandok.local');
  if (serviceId) {
    const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
    await apiDeleteService(login.access_token, serviceId).catch(() => {});
  }
  process.exit(r.status === 'PASS' ? 0 : 1);
});
