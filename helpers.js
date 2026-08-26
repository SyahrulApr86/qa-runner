// Everything below apiRegister() is an example lifted from one specific
// app's API (routes, payloads, table names). It shows the *pattern* for
// wiring up test-account setup and DB cleanup; swap the route paths,
// payloads, and table names in deleteTestUsers/clearCustomerCart/etc. for
// your own app rather than importing this file as-is into a different
// project. FE/BE/DB_URL/MAILHOG and the psql/mailhogLatestLink helpers are
// the reusable part.
const { execSync } = require('child_process');
const path = require('path');

const FE = process.env.QA_FRONTEND_URL || 'http://localhost:3001';
const BE = process.env.QA_BACKEND_URL || 'http://localhost:3000';
const DB_URL = process.env.QA_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable';
const MAILHOG = process.env.MAILHOG_URL || 'http://localhost:8025';

function psql(sql) {
  return execSync(`psql "${DB_URL}" -t -A -c "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim();
}

// Inserts a bare SSO-provider row directly (simulating "this person already
// signed in via SSO UI once"), for provisioning test cases that only need
// the target account to exist, not to actually be logged into via browser.
function insertSSOUser(email, name) {
  psql(`insert into users (email, name, auth_provider, email_verified, is_registration_complete, kode_pemesan) values ('${email}', '${name}', 'sso', true, true, '${randomKode()}') on conflict (email) do nothing;`);
}

function randomKode() {
  return '99' + Math.floor(Math.random() * 900000 + 100000);
}

function deleteTestUsers(emails) {
  const list = emails.map((e) => `'${e}'`).join(',');
  psql(`delete from user_roles where user_id in (select id from users where email in (${list}));`);
  psql(`delete from cart_requirement_uploads where cart_item_id in (select ci.id from cart_items ci join carts c on c.id=ci.cart_id join users u on u.id=c.user_id where u.email in (${list}));`);
  psql(`delete from cart_items where cart_id in (select c.id from carts c join users u on u.id=c.user_id where u.email in (${list}));`);
  psql(`delete from submission_requirement_files where submission_item_id in (select si.id from submission_items si join submissions s on s.id=si.submission_id join users u on u.id=s.user_id where u.email in (${list}));`);
  psql(`delete from submission_items where submission_id in (select s.id from submissions s join users u on u.id=s.user_id where u.email in (${list}));`);
  psql(`delete from submissions where user_id in (select id from users where email in (${list}));`);
  psql(`delete from carts where user_id in (select id from users where email in (${list}));`);
  psql(`delete from email_verification_tokens where user_id in (select id from users where email in (${list}));`);
  psql(`delete from password_reset_tokens where user_id in (select id from users where email in (${list}));`);
  psql(`delete from mitra_profiles where user_id in (select id from users where email in (${list}));`);
  psql(`delete from alumni_profiles where user_id in (select id from users where email in (${list}));`);
  psql(`delete from user_study_histories where user_id in (select id from users where email in (${list}));`);
  psql(`delete from users where email in (${list});`);
}

async function mailhogLatestLink(toEmail, pattern) {
  const res = await fetch(`${MAILHOG}/api/v2/messages?limit=20`);
  const data = await res.json();
  const msg = data.items.find((m) => `${m.To[0].Mailbox}@${m.To[0].Domain}` === toEmail);
  if (!msg) throw new Error(`no mailhog message found for ${toEmail}`);
  const match = msg.Content.Body.match(pattern);
  if (!match) throw new Error(`pattern not found in email body for ${toEmail}`);
  return match[0];
}

async function apiRegister(email, password, fullName) {
  const res = await fetch(`${BE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: fullName, email, password, accept_terms: true })
  });
  if (!res.ok) throw new Error(`register failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiVerifyEmail(token) {
  const res = await fetch(`${BE}/api/v1/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  if (!res.ok) throw new Error(`verify failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiLogin(email, password) {
  const res = await fetch(`${BE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiCompleteMitraProfile(token) {
  const res = await fetch(`${BE}/api/v1/auth/profile/mitra`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ job_title: 'QA Tester', company_name: 'PT QA Otomatis', country: 'Indonesia', phone_number: '081200000000' })
  });
  if (!res.ok) throw new Error(`complete mitra profile failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiCompleteAlumniProfile(token) {
  const res = await fetch(`${BE}/api/v1/auth/profile/alumni`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ graduation_year: 2019, faculty: 'Ilmu Komputer', study_program: 'Ilmu Komputer', jenjang: 'Sarjana', phone_number: '081200000001' })
  });
  if (!res.ok) throw new Error(`complete alumni profile failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiSelectRole(token, role) {
  const res = await fetch(`${BE}/api/v1/auth/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role })
  });
  if (!res.ok) throw new Error(`select role failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Full setup for a ready-to-use mitra or alumni account (register, verify
// via MailHog, select role, complete profile), all via API so it's fast
// and doesn't consume part of a TC's own recording.
async function setupCustomerAccount(email, password, name, role) {
  await apiRegister(email, password, name);
  const link = await mailhogLatestLink(email, /token=[\w-]+/);
  const token = link.split('token=')[1];
  await apiVerifyEmail(token);
  const login = await apiLogin(email, password);
  await apiSelectRole(login.access_token, role);
  if (role === 'mitra') await apiCompleteMitraProfile(login.access_token);
  else await apiCompleteAlumniProfile(login.access_token);
}

async function apiCreateService(token, { name, category = 'Legalisasi', price = 25000, days = 2, uploadRequirements = [] }) {
  const res = await fetch(`${BE}/api/v1/staf/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, category, price_amount: price, service_duration_days: days, upload_requirements: uploadRequirements })
  });
  if (!res.ok) throw new Error(`create service failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiDeleteService(token, id) {
  await fetch(`${BE}/api/v1/staf/services/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
}

async function apiAddCartItem(token, serviceId) {
  const res = await fetch(`${BE}/api/v1/dashboard/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ service_id: serviceId })
  });
  if (!res.ok) throw new Error(`add cart item failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function clearCustomerCart(email) {
  psql(`delete from cart_requirement_uploads where cart_item_id in (select ci.id from cart_items ci join carts c on c.id=ci.cart_id join users u on u.id=c.user_id where u.email='${email}');`);
  psql(`delete from cart_items where cart_id in (select c.id from carts c join users u on u.id=c.user_id where u.email='${email}');`);
}

async function apiGetCart(token) {
  const res = await fetch(`${BE}/api/v1/dashboard/cart`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`get cart failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiCreateAnnouncement(token, title, content = 'Isi pengumuman untuk QA testing.') {
  const res = await fetch(`${BE}/api/v1/staf/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, content })
  });
  if (!res.ok) throw new Error(`create announcement failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiDeleteAnnouncement(token, id) {
  await fetch(`${BE}/api/v1/staf/announcements/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
}

async function apiUploadMitraDocument(token, label, filePath) {
  const fs = require('fs');
  const form = new FormData();
  form.append('document_label', label);
  form.append('file', new Blob([fs.readFileSync(filePath)]), path.basename(filePath));

  const res = await fetch(`${BE}/api/v1/dashboard/mitra/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  if (!res.ok) throw new Error(`upload mitra document failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiListMitraForReview(token, status = '') {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${BE}/api/v1/staf/mitra-verifications${query}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`list mitra for review failed: ${res.status} ${await res.text()}`);
  return (await res.json()).mitras;
}

async function apiReviewMitra(token, userId, decision, rejectionReason = '') {
  const res = await fetch(`${BE}/api/v1/staf/mitra-verifications/${userId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ decision, rejection_reason: rejectionReason })
  });
  if (!res.ok) throw new Error(`review mitra failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Deletes rows created by the sprint 2 mitra-verification and
// alumni-verification-request features, in addition to the base cleanup
// deleteTestUsers already performs for every other table.
function deleteMitraVerificationTestData(emails) {
  const list = emails.map((e) => `'${e}'`).join(',');
  const ownRequests = `select id from alumni_verification_requests where mitra_id in (select id from users where email in (${list}))`;
  psql(`delete from alumni_verification_letters where request_id in (${ownRequests});`);
  psql(`delete from alumni_verification_status_histories where request_id in (${ownRequests});`);
  psql(`delete from alumni_verification_documents where request_id in (${ownRequests});`);
  psql(`delete from alumni_verification_requests where mitra_id in (select id from users where email in (${list}));`);
  psql(`delete from mitra_legality_documents where user_id in (select id from users where email in (${list}));`);
}

// setupApprovedMitra runs the whole onboarding path for a mitra account
// (register, verify, pick role, complete profile, upload a legality
// document, get approved by staf) and returns a fresh login for it, so
// alumni verification scenarios can start from a usable account.
async function setupApprovedMitra(email, password, name) {
  const path = require('path');
  await apiRegister(email, password, name);
  const link = await mailhogLatestLink(email, /token=[\w-]+/);
  await apiVerifyEmail(link.split('token=')[1]);
  const login = await apiLogin(email, password);
  await apiSelectRole(login.access_token, 'mitra');
  await apiCompleteMitraProfile(login.access_token);
  await apiUploadMitraDocument(login.access_token, 'Akta Pendirian Perusahaan', path.join(__dirname, 'test-upload.pdf'));

  const staf = await apiLogin('staf.test@yandok.local', 'TestStaf123');
  const mitras = await apiListMitraForReview(staf.access_token, 'pending');
  const target = mitras.find((m) => m.email === email);
  if (!target) throw new Error(`setup: ${email} not found in the pending mitra review list`);
  await apiReviewMitra(staf.access_token, target.user_id, 'approved');

  return await apiLogin(email, password);
}

async function apiSubmitAlumniVerification(token, data) {
  const res = await fetch(`${BE}/api/v1/dashboard/alumni-verifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`submit alumni verification failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiReviewAlumniVerification(token, requestId, decision, note = '') {
  const res = await fetch(`${BE}/api/v1/staf/alumni-verifications/${requestId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ decision, note })
  });
  if (!res.ok) throw new Error(`review alumni verification failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiIssueAlumniVerificationLetter(token, requestId) {
  const res = await fetch(`${BE}/api/v1/staf/alumni-verifications/${requestId}/letter`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`issue letter failed: ${res.status} ${await res.text()}`);
  return res.json();
}

module.exports = {
  FE, BE, DB_URL, MAILHOG,
  psql, insertSSOUser, deleteTestUsers,
  mailhogLatestLink,
  apiRegister, apiVerifyEmail, apiLogin, apiCompleteMitraProfile, apiCompleteAlumniProfile, apiSelectRole,
  setupCustomerAccount, apiCreateService, apiDeleteService, apiAddCartItem, apiGetCart, clearCustomerCart,
  apiCreateAnnouncement, apiDeleteAnnouncement,
  apiUploadMitraDocument, apiListMitraForReview, apiReviewMitra, deleteMitraVerificationTestData,
  setupApprovedMitra, apiSubmitAlumniVerification, apiReviewAlumniVerification, apiIssueAlumniVerificationLetter
};
