const { withRecordedPage, loginViaForm, smoothClick, gotoReady } = require('./runner');
const { FE, apiLogin, apiCreateService, apiDeleteService, apiAddCartItem } = require('./helpers');

const NAME = `QA RemoveItem ${Date.now()}`;
let serviceId;

withRecordedPage('TC-42_customer_remove_cart_item', async (page) => {
  const stafLogin = await apiLogin('staf.test@yandok.local', 'TestStaf123');
  serviceId = (await apiCreateService(stafLogin.access_token, { name: NAME })).id;
  const alumniLogin = await apiLogin('e2e-alumni@yandok.local', 'QaTest1234');
  await apiAddCartItem(alumniLogin.access_token, serviceId);

  await loginViaForm(page, FE, 'e2e-alumni@yandok.local', 'QaTest1234');
  await gotoReady(page, `${FE}/dashboard/cart`);
  await page.waitForTimeout(700);

  const card = page.locator('article', { has: page.getByText(NAME) });
  await smoothClick(page, card.getByRole('button', { name: 'Hapus' }));
  await page.waitForTimeout(1200);

  // The success toast itself says "NAME dihapus dari keranjang", so check
  // for the absence of the item card specifically, not any text match.
  const stillThere = await page.locator('article', { has: page.getByText(NAME) }).count();
  if (stillThere > 0) throw new Error('expected item card to be removed from the cart');
  const emptyState = await page.getByText('Keranjang masih kosong').count();
  if (emptyState === 0) throw new Error('expected empty-cart state after removing the only item');
}).then(async (r) => {
  if (serviceId) {
    const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
    await apiDeleteService(login.access_token, serviceId).catch(() => {});
  }
  process.exit(r.status === 'PASS' ? 0 : 1);
});
