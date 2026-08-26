const { withRecordedPage, loginViaForm, smoothClick, smoothType } = require('./runner');
const { FE } = require('./helpers');

const SERVICE_NAME = `QA Layanan Test ${Date.now()}`;

withRecordedPage('TC-29_staf_create_service', async (page) => {
  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await page.goto(`${FE}/staf/services`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await smoothClick(page, page.getByRole('button', { name: 'Tambah Layanan' }));
  await page.waitForTimeout(400);

  await smoothType(page, page.getByPlaceholder('Contoh: Legalisasi Ijazah'), SERVICE_NAME);
  await smoothClick(page, page.getByLabel('Kategori'));
  await smoothClick(page, page.getByRole('option', { name: 'Legalisasi' }));
  await smoothType(page, page.getByLabel('Tarif (Rp)'), '50000');
  await smoothType(page, page.getByLabel('Estimasi Penyelesaian'), '3');

  await smoothClick(page, page.getByRole('button', { name: 'Tambah Layanan', exact: true }).last());
  await page.waitForTimeout(1200);

  const success = await page.getByText('berhasil ditambahkan').count();
  if (success === 0) throw new Error('expected success message after creating a service');
  const inTable = await page.getByText(SERVICE_NAME).count();
  if (inTable === 0) throw new Error('expected new service to appear in the catalog table');
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
