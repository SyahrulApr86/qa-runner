const { withRecordedPage, smoothClick, smoothType, loginViaForm } = require('./runner');
const { FE, apiRegister, apiVerifyEmail, apiLogin, apiSelectRole, mailhogLatestLink, deleteTestUsers } = require('./helpers');

const EMAIL = `qa-tc08-${Date.now()}@yandok.local`;
const PASSWORD = 'QaTest1234';

async function setup() {
  await apiRegister(EMAIL, PASSWORD, 'QA Mitra Wizard');
  const link = await mailhogLatestLink(EMAIL, /token=[\w-]+/);
  await apiVerifyEmail(link.split('token=')[1]);
  const login = await apiLogin(EMAIL, PASSWORD);
  await apiSelectRole(login.access_token, 'mitra');
}

withRecordedPage('TC-07_complete_mitra_profile', async (page) => {
  await setup();

  // Real browser login (not cookie injection): postLoginPath sends an
  // account with a role picked but no profile yet straight to the mitra
  // profile step.
  await loginViaForm(page, FE, EMAIL, PASSWORD);
  await page.waitForURL('**/register/profile/mitra**', { timeout: 10000 });

  await smoothType(page, page.getByLabel('Jabatan'), 'QA Engineer');
  await smoothType(page, page.getByLabel('Nama Perusahaan/Instansi'), 'PT QA Otomatis');
  await smoothType(page, page.getByLabel('Negara'), 'Indonesia');
  await smoothType(page, page.getByLabel('Nomor Telepon'), '081200000099');
  await smoothClick(page, page.getByRole('button', { name: 'Selesai' }));

  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(2000);
  const hasMitraBadge = await page.getByText('mitra', { exact: true }).count();
  if (hasMitraBadge === 0) throw new Error('expected user_type=mitra badge on dashboard after profile completion');
}).then(async (r) => {
  deleteTestUsers([EMAIL]);
  process.exit(r.status === 'PASS' ? 0 : 1);
});
