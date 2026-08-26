const { withRecordedPage, loginViaForm, smoothClick, gotoReady } = require('./runner');
const { FE, apiLogin, apiCreateService, apiDeleteService, apiAddCartItem, clearCustomerCart } = require('./helpers');

clearCustomerCart('e2e-alumni@yandok.local');

const NAME = `QA Checkout ${Date.now()}`;
let serviceId;

withRecordedPage('TC-45_customer_checkout_cart', async (page) => {
  const stafLogin = await apiLogin('staf.test@yandok.local', 'TestStaf123');
  // No upload requirements, so nothing blocks checkout.
  serviceId = (await apiCreateService(stafLogin.access_token, { name: NAME })).id;
  const alumniLogin = await apiLogin('e2e-alumni@yandok.local', 'QaTest1234');
  await apiAddCartItem(alumniLogin.access_token, serviceId);

  await loginViaForm(page, FE, 'e2e-alumni@yandok.local', 'QaTest1234');
  await gotoReady(page, `${FE}/dashboard/cart`);
  await page.waitForTimeout(700);

  await smoothClick(page, page.getByRole('button', { name: 'Submit Pengajuan' }));
  await page.waitForTimeout(1500);

  const url = page.url();
  if (!url.includes('/dashboard/orders')) throw new Error(`expected checkout to redirect to orders, got: ${url}`);

  const emptyCart = await page.getByText('Keranjang masih kosong').count();
  // navigate back to cart to confirm it was cleared
  await gotoReady(page, `${FE}/dashboard/cart`);
  await page.waitForTimeout(500);
  const clearedCart = await page.getByText('Keranjang masih kosong').count();
  if (clearedCart === 0) throw new Error('expected cart to be empty after successful checkout');
}).then(async (r) => {
  if (serviceId) {
    const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
    await apiDeleteService(login.access_token, serviceId).catch(() => {});
  }
  process.exit(r.status === 'PASS' ? 0 : 1);
});
