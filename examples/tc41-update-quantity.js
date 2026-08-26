const { withRecordedPage, loginViaForm, smoothClick, gotoReady } = require('./runner');
const { FE, apiLogin, apiCreateService, apiDeleteService, apiAddCartItem, clearCustomerCart } = require('./helpers');

const NAME = `QA UpdateQty ${Date.now()}`;
let serviceId;

withRecordedPage('TC-41_customer_update_cart_item_quantity', async (page) => {
  const stafLogin = await apiLogin('staf.test@yandok.local', 'TestStaf123');
  serviceId = (await apiCreateService(stafLogin.access_token, { name: NAME })).id;
  const alumniLogin = await apiLogin('e2e-alumni@yandok.local', 'QaTest1234');
  await apiAddCartItem(alumniLogin.access_token, serviceId);

  await loginViaForm(page, FE, 'e2e-alumni@yandok.local', 'QaTest1234');
  await gotoReady(page, `${FE}/dashboard/cart`);
  await page.waitForTimeout(700);

  const card = page.locator('article', { has: page.getByText(NAME) });
  const qtyControl = card.locator('div.inline-flex.items-center.rounded-xl');
  const before = await card.locator('span.min-w-12').innerText();
  await smoothClick(page, qtyControl.locator('button').nth(1)); // [0]=decrease, [1]=increase
  await page.waitForTimeout(1000);
  const after = await card.locator('span.min-w-12').innerText();

  if (Number(after) !== Number(before) + 1) throw new Error(`expected quantity to go from ${before} to ${Number(before) + 1}, got ${after}`);
}).then(async (r) => {
  clearCustomerCart('e2e-alumni@yandok.local');
  if (serviceId) {
    const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
    await apiDeleteService(login.access_token, serviceId).catch(() => {});
  }
  process.exit(r.status === 'PASS' ? 0 : 1);
});
