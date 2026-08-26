const { withRecordedPage, gotoReady } = require('./runner');
const { FE } = require('./helpers');

withRecordedPage('TC-46_guest_accesses_landing_without_login', async (page) => {
  await gotoReady(page, `${FE}/`);
  const url = page.url();
  if (!url.endsWith('/') && !url.endsWith('localhost:3001')) throw new Error(`expected to land on the guest landing page, got ${url}`);

  const bodyText = await page.locator('body').innerText();
  if (!bodyText.includes('Yandok') && !bodyText.includes('Layanan')) {
    throw new Error('expected landing page content to be visible to a guest');
  }
}).then((r) => process.exit(r.status === 'PASS' ? 0 : 1));
