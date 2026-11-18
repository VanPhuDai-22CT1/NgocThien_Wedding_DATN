// Uses the real API handlers and database with a private email transport stub.
// No email is sent; only the fixture user created here is removed.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mailer = require('../dist/utils/mailer');
const app = require('../dist/app').default;
const { User } = require('../dist/models');
const sequelize = require('../dist/config/database').default;

(async () => {
  const prefix = `qa_auth_${randomUUID().slice(0, 8)}`;
  const email = `${prefix}@example.com`;
  const original = mailer.sendPasswordResetOtp;
  let emailAvailable = false;
  const sent = [];
  mailer.sendPasswordResetOtp = async (to, code) => {
    assert.equal(to, email);
    if (!emailAvailable) return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
    sent.push(code); return { sent: true };
  };
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let userId; let checks = 0;
  const request = async (path, body, expected = 200) => {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, expected, `Unexpected response for ${path}`);
    checks++; return response.json();
  };
  try {
    const registration = await request('/auth/register', { username: prefix, email, password: 'Old-Test-123', confirmPassword: 'Old-Test-123', phone: '0901234567', address: 'QA address' }, 201);
    userId = registration.data.user_id;
    assert(userId);
    assert((await request('/auth/login', { email, password: 'Old-Test-123' })).success);
    assert.equal((await request('/legacy?action=reset_password', { email, password: 'New-Test-123' })).success, false);
    assert.equal((await request('/legacy', { action: 'forgotPassword', email }, 500)).success, false);
    assert.equal(sent.length, 0);
    emailAvailable = true;
    assert((await request('/legacy', { action: 'forgotPassword', email })).success);
    assert.equal(sent.length, 1);
    assert(/^\d{6}$/.test(sent[0]));
    await request('/legacy', { action: 'verifyOtp', email, otp: '123' }, 400);
    assert.equal((await request('/legacy', { action: 'verifyOtp', email, otp: sent[0] === '111111' ? '222222' : '111111' })).success, false);
    assert.equal((await request('/legacy?action=reset_password', { email, password: 'New-Test-123' })).success, false);
    assert((await request('/legacy', { action: 'forgotPassword', email })).success);
    assert.equal(sent.length, 2);
    assert((await request('/legacy', { action: 'verifyOtp', email, otp: sent[1] })).success);
    assert((await request('/legacy?action=reset_password', { email, password: 'New-Test-123' })).success);
    await request('/auth/login', { email, password: 'Old-Test-123' }, 401);
    assert((await request('/auth/login', { email, password: 'New-Test-123' })).success);
    assert.equal((await request('/legacy?action=reset_password', { email, password: 'Replay-Test-123' })).success, false);
    console.log(`PASS: ${checks} real authentication/recovery API checks; email delivery stubbed, no external messages sent.`);
  } finally {
    mailer.sendPasswordResetOtp = original;
    if (userId) await User.destroy({ where: { id: userId } });
    await new Promise(resolve => { server.close(resolve); server.closeIdleConnections?.(); });
    await sequelize.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
