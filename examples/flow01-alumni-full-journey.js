const path = require('path');
const { withRecordedPage, smoothClick, smoothType, gotoReady, showEmailInMailhog } = require('./runner');
const { FE, apiLogin, apiCreateService, apiDeleteService, mailhogLatestLink, deleteTestUsers } = require('./helpers');

const EMAIL = `qa-flow-alumni-${Date.now()}@yandok.local`;
const PASSWORD = 'QaTest1234';
const SERVICE_NAME = `Legalisasi Ijazah ${Date.now()}`;
let serviceId;

async function setup() {
  const stafLogin = await apiLogin('staf.test@yandok.local', 'TestStaf123');
  serviceId = (await apiCreateService(stafLogin.access_token, {
    name: SERVICE_NAME,
    uploadRequirements: [{ name: 'Scan KTP', allowed_extensions: ['PDF'], max_file_size_mb: 5, is_required: true }]
  })).id;
}

withRecordedPage('FLOW-01_alumni_registrasi_sampai_pesanan', async (page) => {
  await setup();

  // 1. Registrasi akun baru
  await gotoReady(page, `${FE}/register`);
  await smoothType(page, page.getByPlaceholder('Nama lengkap Anda'), 'QA Alumni Flow');
  await smoothType(page, page.getByPlaceholder('nama@contoh.com'), EMAIL);
  await smoothType(page, page.getByPlaceholder('Min. 8 karakter'), PASSWORD);
  await smoothType(page, page.getByPlaceholder('Ulangi password'), PASSWORD);
  await smoothClick(page, page.getByRole('checkbox'));
  await smoothClick(page, page.getByRole('button', { name: 'Lanjutkan' }));
  await page.waitForURL('**/register/check-email**', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // 2. Verifikasi email lewat link asli dari MailHog
  await showEmailInMailhog(page, EMAIL);
  const link = await mailhogLatestLink(EMAIL, /token=[\w-]+/);
  const token = link.split('token=')[1];
  await gotoReady(page, `${FE}/verify-email?token=${token}`);
  await page.waitForSelector('text=Email berhasil diverifikasi', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // 3. Login, lalu pilih peran Alumni
  await gotoReady(page, `${FE}/login`);
  await smoothType(page, page.getByPlaceholder('nama@contoh.com'), EMAIL);
  await smoothType(page, page.getByPlaceholder('Password Anda'), PASSWORD);
  await smoothClick(page, page.getByRole('button', { name: 'Masuk', exact: true }));
  await page.waitForURL('**/register/role**', { timeout: 10000 });
  await page.waitForTimeout(2000);

  await smoothClick(page, page.getByRole('button', { name: /Alumni/ }));
  await smoothClick(page, page.getByRole('button', { name: 'Lanjutkan' }));
  await page.waitForURL('**/register/profile/alumni**', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // 4. Lengkapi profil alumni (Fakultas -> Prodi -> Jenjang)
  await smoothType(page, page.getByLabel('Tahun Lulus'), '2020');
  await smoothClick(page, page.locator('div[data-orientation="vertical"]').filter({ hasText: 'Fakultas' }).locator('button'));
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: 'Ilmu Komputer', exact: true }).click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await smoothClick(page, page.locator('div[data-orientation="vertical"]').filter({ hasText: 'Program Studi' }).locator('button'));
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: 'Ilmu Komputer', exact: true }).click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await smoothClick(page, page.locator('div[data-orientation="vertical"]').filter({ hasText: 'Jenjang' }).locator('button'));
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: 'Sarjana', exact: true }).click({ timeout: 5000 });
  await smoothType(page, page.getByLabel('Nomor Telepon'), '081234500001');
  await smoothClick(page, page.getByRole('button', { name: 'Selesai' }));
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // 5. Buka Katalog Layanan, tambah layanan ke keranjang
  await smoothClick(page, page.getByRole('link', { name: 'Katalog Layanan' }));
  await page.waitForURL('**/dashboard/services**', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const card = page.locator('article', { has: page.getByText(SERVICE_NAME) });
  await smoothClick(page, card.getByRole('button', { name: 'Tambah ke Keranjang' }));
  await page.waitForTimeout(2000);

  // 6. Buka Keranjang, lengkapi persyaratan upload
  await smoothClick(page, page.getByRole('link', { name: 'Keranjang' }));
  await page.waitForURL('**/dashboard/cart**', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const cartCard = page.locator('article', { has: page.getByText(SERVICE_NAME) }).first();
  await smoothClick(page, cartCard.getByRole('button', { name: 'Lengkapi Persyaratan' }));
  await page.waitForTimeout(500);
  await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, 'test-upload.pdf'));
  await page.waitForSelector('text=Terunggah', { timeout: 10000 });
  await page.waitForTimeout(1500);
  await smoothClick(page, page.locator('.fixed.inset-0.z-50 button').first());
  await page.waitForTimeout(2000);

  // 7. Submit pengajuan (checkout)
  await smoothClick(page, page.getByRole('button', { name: 'Submit Pengajuan' }));
  await page.waitForURL('**/dashboard/orders**', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const orderShown = await page.getByText(SERVICE_NAME).count();
  if (orderShown === 0) throw new Error('expected the submitted order to appear on the Pesanan page');
}).then(async (r) => {
  if (serviceId) {
    const login = await apiLogin('staf.test@yandok.local', 'TestStaf123');
    await apiDeleteService(login.access_token, serviceId).catch(() => {});
  }
  deleteTestUsers([EMAIL]);
  process.exit(r.status === 'PASS' ? 0 : 1);
});
