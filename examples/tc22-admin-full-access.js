const { withRecordedPage, loginViaForm, smoothClick } = require('./runner');
const { FE } = require('./helpers');

withRecordedPage('TC-22_admin_full_access', async (page) => {
  await loginViaForm(page, FE, 'admin.test@yandok.local', 'TestAdmin123');
  await page.waitForURL('**/dashboard');

  for (const linkName of ['Kelola Layanan', 'Kelola Pengumuman', 'Kelola Staf']) {
    await smoothClick(page, page.getByRole('link', { name: linkName }));
    await page.waitForTimeout(800);
    const denied = await page.getByText('Halaman ini khusus admin').count();
    if (denied > 0) throw new Error(`admin should not be denied on ${linkName}`);
  }
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
