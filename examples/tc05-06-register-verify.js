const { withRecordedPage, smoothClick, smoothType, gotoReady, showEmailInMailhog } = require('./runner');
const { FE, mailhogLatestLink, deleteTestUsers } = require('./helpers');

const EMAIL = `qa-tc06-${Date.now()}@yandok.local`;
const PASSWORD = 'QaTest1234';

withRecordedPage('TC-05-06_register_and_verify_email', async (page) => {
  await gotoReady(page, `${FE}/register`);

  await smoothType(page, page.getByPlaceholder('Nama lengkap Anda'), 'QA Register Test');
  await smoothType(page, page.getByPlaceholder('nama@contoh.com'), EMAIL);
  await smoothType(page, page.getByPlaceholder('Min. 8 karakter'), PASSWORD);
  await smoothType(page, page.getByPlaceholder('Ulangi password'), PASSWORD);
  await smoothClick(page, page.getByRole('checkbox'));
  await smoothClick(page, page.getByRole('button', { name: 'Lanjutkan' }));

  await page.waitForURL('**/register/check-email**', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // TC-06: check the inbox in MailHog, then follow the real verification link.
  await showEmailInMailhog(page, EMAIL);
  const link = await mailhogLatestLink(EMAIL, /token=[\w-]+/);
  const token = link.split('token=')[1];
  await gotoReady(page, `${FE}/verify-email?token=${token}`);
  await page.waitForSelector('text=Email berhasil diverifikasi', { timeout: 10000 });
}).then(async (r) => {
  deleteTestUsers([EMAIL]);
  process.exit(r.status === 'PASS' ? 0 : 1);
});
