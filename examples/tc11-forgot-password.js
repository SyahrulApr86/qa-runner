const { withRecordedPage, smoothClick, smoothType, gotoReady, loginViaForm, showEmailInMailhog } = require('./runner');
const { FE, apiRegister, apiVerifyEmail, mailhogLatestLink, deleteTestUsers } = require('./helpers');

const EMAIL = `qa-tc12-${Date.now()}@yandok.local`;
const OLD_PASSWORD = 'QaTest1234';
const NEW_PASSWORD = 'QaTestNew5678';

withRecordedPage('TC-11_forgot_and_reset_password', async (page) => {
  await apiRegister(EMAIL, OLD_PASSWORD, 'QA Forgot Password');
  const verifyLink = await mailhogLatestLink(EMAIL, /token=[\w-]+/);
  await apiVerifyEmail(verifyLink.split('token=')[1]);

  await gotoReady(page, `${FE}/forgot-password`);
  await smoothType(page, page.locator('input[type="email"]'), EMAIL);
  await smoothClick(page, page.getByRole('button', { name: 'Kirim tautan reset' }));
  await page.waitForTimeout(1000);

  await showEmailInMailhog(page, EMAIL);
  const resetLink = await mailhogLatestLink(EMAIL, /reset-password\?token=[\w-]+/);
  const token = resetLink.split('token=')[1];
  await gotoReady(page, `${FE}/reset-password?token=${token}`);

  await smoothType(page, page.locator('input[type="password"]'), NEW_PASSWORD);
  await smoothClick(page, page.getByRole('button', { name: 'Simpan password baru' }));
  await page.waitForTimeout(1000);
  await smoothClick(page, page.getByRole('button', { name: 'Masuk sekarang' }));
  await page.waitForURL('**/login**', { timeout: 10000 });

  // confirm the new password actually works
  await loginViaForm(page, FE, EMAIL, NEW_PASSWORD);
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 10000 });
}).then(async (r) => {
  deleteTestUsers([EMAIL]);
  process.exit(r.status === 'PASS' ? 0 : 1);
});
