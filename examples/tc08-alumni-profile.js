const { withRecordedPage, smoothClick, smoothType, loginViaForm, fieldSelect } = require('./runner');
const { FE, apiRegister, apiVerifyEmail, apiLogin, apiSelectRole, mailhogLatestLink, deleteTestUsers } = require('./helpers');

const EMAIL = `qa-tc09-${Date.now()}@yandok.local`;
const PASSWORD = 'QaTest1234';

async function setup() {
  await apiRegister(EMAIL, PASSWORD, 'QA Alumni Wizard');
  const link = await mailhogLatestLink(EMAIL, /token=[\w-]+/);
  await apiVerifyEmail(link.split('token=')[1]);
  const login = await apiLogin(EMAIL, PASSWORD);
  await apiSelectRole(login.access_token, 'alumni');
}

withRecordedPage('TC-08_complete_alumni_profile', async (page) => {
  await setup();
  await loginViaForm(page, FE, EMAIL, PASSWORD);
  await page.waitForURL('**/register/profile/alumni**', { timeout: 10000 });

  await smoothType(page, page.getByLabel('Tahun Lulus'), '2018');
  await smoothClick(page, fieldSelect(page, 'Fakultas'));
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: 'Ilmu Komputer', exact: true }).click({ timeout: 5000 });
  await page.waitForTimeout(300);
  await smoothClick(page, fieldSelect(page, 'Program Studi'));
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: 'Sistem Informasi', exact: true }).click({ timeout: 5000 });
  await page.waitForTimeout(300);
  await smoothClick(page, fieldSelect(page, 'Jenjang'));
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: 'Sarjana', exact: true }).click({ timeout: 5000 });
  await smoothType(page, page.getByLabel('Nomor Telepon'), '081200000098');
  await smoothClick(page, page.getByRole('button', { name: 'Selesai' }));

  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(2000);
  const hasAlumniBadge = await page.getByText('alumni', { exact: true }).count();
  if (hasAlumniBadge === 0) throw new Error('expected user_type=alumni badge on dashboard after profile completion');
  const hasStudyProgram = await page.getByText('Sistem Informasi').count();
  if (hasStudyProgram === 0) throw new Error('expected selected study program to appear on dashboard after profile completion');
}).then(async (r) => {
  deleteTestUsers([EMAIL]);
  process.exit(r.status === 'PASS' ? 0 : 1);
});
