const { withRecordedPage, loginViaForm, smoothClick, smoothType, gotoReady } = require('./runner');
const { FE, apiLogin, apiDeleteService, apiDeleteAnnouncement, psql } = require('./helpers');

const SERVICE_NAME = `QA Flow Layanan ${Date.now()}`;
const SERVICE_NAME_EDITED = `QA Flow Layanan Updated ${Date.now()}`;
const ANNOUNCEMENT_TITLE = `QA Flow Pengumuman ${Date.now()}`;
const ANNOUNCEMENT_TITLE_EDITED = `QA Flow Pengumuman Updated ${Date.now()}`;
let serviceId;

// Logs out whoever is currently signed in. Necessary between every staf
// action and every "what does the user see" check: staying logged in as
// staf while visiting /dashboard/services or the landing page still shows
// the staf navbar (Kelola Layanan/Kelola Pengumuman, "Staf Test"), which
// makes the customer/guest perspective look unconvincing on video even
// though the page content itself is genuinely the same one a real pemesan
// or guest would see.
async function logoutCurrentUser(page, displayName) {
  await smoothClick(page, page.getByRole('button', { name: displayName }));
  await page.waitForTimeout(500);
  await smoothClick(page, page.getByText('Keluar', { exact: true }));
  await page.waitForURL((u) => !u.pathname.includes('/dashboard') && !u.pathname.includes('/staf'), { timeout: 10000 });
  await page.waitForTimeout(1500);
}

withRecordedPage('FLOW-02_staf_kelola_layanan_dan_pengumuman', async (page) => {
  // 1. Sebagai pemesan (alumni): sebelum ada perubahan, layanan ini belum ada
  await loginViaForm(page, FE, 'e2e-alumni@yandok.local', 'QaTest1234');
  await gotoReady(page, `${FE}/dashboard/services`);
  const beforeAdd = await page.getByText(SERVICE_NAME).count();
  if (beforeAdd > 0) throw new Error('service should not exist in customer catalog before it is created');
  await logoutCurrentUser(page, 'QA Alumni Test');

  // 2. Sebagai staf: buat layanan baru + persyaratan unggah
  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await gotoReady(page, `${FE}/staf/services`);
  await smoothClick(page, page.getByRole('button', { name: 'Tambah Layanan' }));
  await page.waitForTimeout(500);
  await smoothType(page, page.getByPlaceholder('Contoh: Legalisasi Ijazah'), SERVICE_NAME);
  await smoothClick(page, page.getByLabel('Kategori'));
  await smoothClick(page, page.getByRole('option', { name: 'Legalisasi' }));
  await smoothType(page, page.getByLabel('Tarif (Rp)'), '60000');
  await smoothType(page, page.getByLabel('Estimasi Penyelesaian'), '3');
  await smoothClick(page, page.getByRole('button', { name: 'Tambah Layanan', exact: true }).last());
  await page.waitForTimeout(2000);

  let created = await page.getByText(SERVICE_NAME).count();
  if (created === 0) throw new Error('expected new service to appear in the catalog table');
  serviceId = psql(`select id from services where name = '${SERVICE_NAME}' limit 1;`);

  let row = page.locator('tr', { has: page.getByText(SERVICE_NAME, { exact: true }) });
  await smoothClick(page, row.locator('button').nth(2));
  await page.waitForTimeout(1000);
  await smoothClick(page, page.getByRole('button', { name: 'Add Upload Requirement' }));
  await page.waitForTimeout(500);
  await smoothType(page, page.getByPlaceholder('Contoh: Scan KTP'), 'Scan KTP');
  await smoothClick(page, page.getByRole('button', { name: 'PDF' }));
  await smoothClick(page, page.getByRole('button', { name: 'Tambah Dokumen' }));
  await page.waitForTimeout(1000);
  await smoothClick(page, page.getByRole('button', { name: 'Simpan Perubahan' }));
  await page.waitForTimeout(2000);
  await logoutCurrentUser(page, 'Staf Test');

  // 3. Sebagai pemesan: layanan baru sekarang muncul di katalog
  await loginViaForm(page, FE, 'e2e-alumni@yandok.local', 'QaTest1234');
  await gotoReady(page, `${FE}/dashboard/services`);
  const afterAdd = await page.getByText(SERVICE_NAME).count();
  if (afterAdd === 0) throw new Error('expected new service to appear in the customer catalog after being added');
  await logoutCurrentUser(page, 'QA Alumni Test');

  // 4. Sebagai staf: edit nama layanan
  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await gotoReady(page, `${FE}/staf/services`);
  row = page.locator('tr', { has: page.getByText(SERVICE_NAME, { exact: true }) });
  await smoothClick(page, row.locator('button').nth(2));
  await page.waitForTimeout(1000);
  const nameInput = page.getByPlaceholder('Contoh: Legalisasi Ijazah');
  await nameInput.fill('');
  await smoothType(page, nameInput, SERVICE_NAME_EDITED);
  await smoothClick(page, page.getByRole('button', { name: 'Simpan Perubahan' }));
  await page.waitForTimeout(2000);

  const renamed = await page.getByText(SERVICE_NAME_EDITED).count();
  if (renamed === 0) throw new Error('expected renamed service to appear in the catalog table');
  await logoutCurrentUser(page, 'Staf Test');

  // 5. Sebagai pemesan: nama baru yang tampil, nama lama sudah tidak ada
  await loginViaForm(page, FE, 'e2e-alumni@yandok.local', 'QaTest1234');
  await gotoReady(page, `${FE}/dashboard/services`);
  const oldNameGone = await page.getByText(SERVICE_NAME, { exact: true }).count();
  const newNameShown = await page.getByText(SERVICE_NAME_EDITED).count();
  if (oldNameGone > 0) throw new Error('old service name should no longer appear in customer catalog after rename');
  if (newNameShown === 0) throw new Error('expected renamed service to appear in customer catalog');
  await logoutCurrentUser(page, 'QA Alumni Test');

  // 6. Sebagai staf: ubah status jadi Tidak Dilayani
  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await gotoReady(page, `${FE}/staf/services`);
  row = page.locator('tr', { has: page.getByText(SERVICE_NAME_EDITED, { exact: true }) });
  await smoothClick(page, row.getByRole('button', { name: 'Dilayani' }));
  await page.waitForTimeout(1500);
  const toggledOff = await row.getByText('Tidak Dilayani').count();
  if (toggledOff === 0) throw new Error('expected status to flip to Tidak Dilayani after toggling');
  await logoutCurrentUser(page, 'Staf Test');

  // 7. Sebagai pemesan: layanan yang dinonaktifkan sudah tidak muncul lagi
  await loginViaForm(page, FE, 'e2e-alumni@yandok.local', 'QaTest1234');
  await gotoReady(page, `${FE}/dashboard/services`);
  const hiddenAfterToggle = await page.getByText(SERVICE_NAME_EDITED).count();
  if (hiddenAfterToggle > 0) throw new Error('a disabled (Tidak Dilayani) service must not appear in the customer catalog');
  await logoutCurrentUser(page, 'QA Alumni Test');

  // 8. Sebagai staf: hapus layanan
  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await gotoReady(page, `${FE}/staf/services`);
  row = page.locator('tr', { has: page.getByText(SERVICE_NAME_EDITED, { exact: true }) });
  await smoothClick(page, row.locator('button').nth(3));
  await page.waitForTimeout(400);
  await smoothClick(page, page.getByRole('button', { name: /^Hapus$/ }));
  await page.waitForTimeout(2000);

  const stillThere = await page.getByText(SERVICE_NAME_EDITED).count();
  if (stillThere > 0) throw new Error('expected service to be removed from the catalog table after delete');
  serviceId = null; // already deleted via UI, skip cleanup
  await logoutCurrentUser(page, 'Staf Test');

  // 9. Sebagai guest (belum login): pengumuman ini belum ada di halaman utama
  await gotoReady(page, `${FE}/`);
  const beforeAnnouncement = await page.getByText(ANNOUNCEMENT_TITLE).count();
  if (beforeAnnouncement > 0) throw new Error('announcement should not exist on the public page before it is created');

  // 10. Sebagai staf: buat pengumuman baru
  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await gotoReady(page, `${FE}/staf/announcements`);
  await smoothClick(page, page.getByRole('button', { name: 'Tambah Pengumuman' }));
  await page.waitForTimeout(500);
  await smoothType(page, page.getByPlaceholder('Masukkan judul pengumuman'), ANNOUNCEMENT_TITLE);
  await smoothType(page, page.locator('[contenteditable="true"]'), 'Pengumuman ini dibuat sebagai bagian dari demo alur kerja staf secara menyeluruh.');
  await smoothClick(page, page.getByRole('button', { name: 'Simpan' }));
  await page.waitForTimeout(2000);

  const announcementShown = await page.getByText(ANNOUNCEMENT_TITLE).count();
  if (announcementShown === 0) throw new Error('expected new announcement to appear in the kelola pengumuman list');
  await logoutCurrentUser(page, 'Staf Test');

  // 11. Sebagai guest: pengumuman baru sudah tampil di halaman utama
  await gotoReady(page, `${FE}/`);
  const afterAnnouncement = await page.getByText(ANNOUNCEMENT_TITLE).count();
  if (afterAnnouncement === 0) throw new Error('expected new announcement to appear on the public landing page');

  // 12. Sebagai staf: edit judul pengumuman
  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await gotoReady(page, `${FE}/staf/announcements`);
  let annRow = page.locator('tr', { has: page.getByText(ANNOUNCEMENT_TITLE, { exact: true }) });
  await smoothClick(page, annRow.locator('button').first());
  await page.waitForTimeout(500);
  const titleInput = page.getByPlaceholder('Masukkan judul pengumuman');
  await titleInput.fill('');
  await smoothType(page, titleInput, ANNOUNCEMENT_TITLE_EDITED);
  await smoothClick(page, page.getByRole('button', { name: 'Simpan' }));
  await page.waitForTimeout(2000);

  const announcementRenamed = await page.getByText(ANNOUNCEMENT_TITLE_EDITED).count();
  if (announcementRenamed === 0) throw new Error('expected updated announcement title to appear');
  await logoutCurrentUser(page, 'Staf Test');

  // 13. Sebagai guest: judul baru tampil, judul lama hilang
  await gotoReady(page, `${FE}/`);
  const oldTitleGone = await page.getByText(ANNOUNCEMENT_TITLE, { exact: true }).count();
  const newTitleShown = await page.getByText(ANNOUNCEMENT_TITLE_EDITED).count();
  if (oldTitleGone > 0) throw new Error('old announcement title should no longer appear on the public landing page after rename');
  if (newTitleShown === 0) throw new Error('expected renamed announcement title to appear on the public landing page');

  // 14. Sebagai staf: hapus pengumuman
  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await gotoReady(page, `${FE}/staf/announcements`);
  annRow = page.locator('tr', { has: page.getByText(ANNOUNCEMENT_TITLE_EDITED, { exact: true }) });
  await smoothClick(page, annRow.locator('button').nth(1));
  await page.waitForTimeout(400);
  await smoothClick(page, page.getByRole('button', { name: /^Hapus$/ }));
  await page.waitForTimeout(2000);

  const announcementStillThere = await page.locator('tr', { has: page.getByText(ANNOUNCEMENT_TITLE_EDITED, { exact: true }) }).count();
  if (announcementStillThere > 0) throw new Error('expected announcement row to be removed after delete');
  await logoutCurrentUser(page, 'Staf Test');

  // 15. Sebagai guest: pengumuman yang dihapus sudah tidak tampil lagi
  await gotoReady(page, `${FE}/`);
  const goneAfterDelete = await page.getByText(ANNOUNCEMENT_TITLE_EDITED).count();
  if (goneAfterDelete > 0) throw new Error('deleted announcement must not still appear on the public landing page');
}).then(async (r) => {
  if (serviceId) {
    const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
    await apiDeleteService(login.access_token, serviceId).catch(() => {});
  }
  const announcementId = psql(`select id from announcements where title in ('${ANNOUNCEMENT_TITLE}', '${ANNOUNCEMENT_TITLE_EDITED}') limit 1;`);
  if (announcementId) {
    const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
    await apiDeleteAnnouncement(login.access_token, announcementId).catch(() => {});
  }
  process.exit(r.status === 'PASS' ? 0 : 1);
});
