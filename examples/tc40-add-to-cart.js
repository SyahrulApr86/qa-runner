const { withRecordedPage, loginViaForm, smoothClick, gotoReady } = require('./runner');
const { FE, apiLogin, apiCreateService, apiDeleteService, clearCustomerCart } = require('./helpers');

const NAME = `QA AddCart ${Date.now()}`;
let serviceId;

withRecordedPage('TC-40_customer_add_service_to_cart', async (page) => {
  const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
  serviceId = (await apiCreateService(login.access_token, { name: NAME })).id;

  await loginViaForm(page, FE, 'e2e-alumni@yandok.local', 'QaTest1234');
  await gotoReady(page, `${FE}/dashboard/services`);
  await page.waitForTimeout(800);

  const card = page.locator('article', { has: page.getByText(NAME) });
  await smoothClick(page, card.getByRole('button', { name: 'Tambah ke Keranjang' }));
  await page.waitForTimeout(1000);

  await gotoReady(page, `${FE}/dashboard/cart`);
  await page.waitForTimeout(600);
  const inCart = await page.getByText(NAME).count();
  if (inCart === 0) throw new Error('expected the service to appear in the cart after adding it');
}).then(async (r) => {
  clearCustomerCart('e2e-alumni@yandok.local');
  if (serviceId) {
    const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
    await apiDeleteService(login.access_token, serviceId);
  }
  process.exit(r.status === 'PASS' ? 0 : 1);
});
