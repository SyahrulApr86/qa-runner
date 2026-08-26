const { withRecordedPage, loginViaForm, smoothClick } = require('./runner');
const { FE, apiLogin, apiCreateService, apiDeleteService } = require('./helpers');

const NAME = `QA Toggle Status ${Date.now()}`;
let serviceId;

withRecordedPage('TC-32_staf_toggle_service_status', async (page) => {
  const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
  const created = await apiCreateService(login.access_token, { name: NAME });
  serviceId = created.id;

  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await page.goto(`${FE}/staf/services`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const row = page.locator('tr', { has: page.getByText(NAME) });
  const before = await row.getByText('Dilayani', { exact: true }).count();
  if (before === 0) throw new Error('expected new service to start as Dilayani');

  await smoothClick(page, row.getByRole('button', { name: 'Dilayani' }));
  await page.waitForTimeout(1000);

  const after = await row.getByText('Tidak Dilayani').count();
  if (after === 0) throw new Error('expected status to flip to Tidak Dilayani after toggling');
}).then(async (r) => {
  if (serviceId) {
    const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
    await apiDeleteService(login.access_token, serviceId);
  }
  process.exit(r.status === 'PASS' ? 0 : 1);
});
