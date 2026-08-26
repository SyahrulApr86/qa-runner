const { withRecordedPage, loginViaForm, smoothClick, smoothType, gotoReady } = require('./runner');
const { FE, apiLogin, apiDeleteAnnouncement } = require('./helpers');

const TITLE = `QA Add Announcement ${Date.now()}`;
let announcementId;

withRecordedPage('TC-49_staf_add_announcement', async (page) => {
  await loginViaForm(page, FE, 'staf.test@yandok.local', 'TestStaf123');
  await gotoReady(page, `${FE}/staf/announcements`);
  await page.waitForTimeout(500);

  await smoothClick(page, page.getByRole('button', { name: 'Tambah Pengumuman' }));
  await page.waitForTimeout(400);
  await smoothType(page, page.getByPlaceholder('Masukkan judul pengumuman'), TITLE);
  await smoothType(page, page.locator('[contenteditable="true"]'), 'Isi pengumuman untuk pengujian otomatis QA.');
  await smoothClick(page, page.getByRole('button', { name: 'Simpan' }));
  await page.waitForTimeout(1200);

  const shown = await page.getByText(TITLE).count();
  if (shown === 0) throw new Error('expected new announcement to appear in the kelola pengumuman list');
}).then(async (r) => {
  const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
  const list = await (await fetch('http://localhost:3000/api/v1/staf/announcements', { headers: { Authorization: `Bearer ${login.access_token}` } })).json();
  const created = list.find((a) => a.title === TITLE);
  if (created) await apiDeleteAnnouncement(login.access_token, created.id);
  process.exit(r.status === 'PASS' ? 0 : 1);
});
