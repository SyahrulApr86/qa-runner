const { withRecordedPage, loginViaForm, smoothClick } = require('./runner');
const { FE } = require('./helpers');

withRecordedPage('TC-20_staf_allowed_own_pages', async (page) => {
  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await page.waitForURL('**/dashboard');

  await smoothClick(page, page.getByRole('link', { name: 'Kelola Layanan' }));
  await page.waitForURL('**/staf/services');
  await page.waitForTimeout(2000);
  const errOnServices = await page.getByText('Gagal memuat').count();
  if (errOnServices > 0) throw new Error('staf should be able to load katalog layanan without error');

  await smoothClick(page, page.getByRole('link', { name: 'Kelola Pengumuman' }));
  await page.waitForURL('**/staf/announcements');
  await page.waitForTimeout(2000);
  const errOnAnnouncements = await page.getByText('Gagal memuat').count();
  if (errOnAnnouncements > 0) throw new Error('staf should be able to load pengumuman without error');
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
