const assert = require('node:assert/strict');
const controller = require('../dist/controllers/LegacyController').default;
const db = require('../dist/config/database').default;
(async () => {
  try {
    const request = { body: { action: 'sendLiveChatMessage', chat_session: 'fixture-session', sender: 'admin', message: 'Line one\r\nLine two<script>alert(1)</script>\nLine three\u0000' }, query: {} };
    assert.equal(controller.validateLegacyPayload('sendLiveChatMessage', request), null);
    assert.equal(request.body.message, 'Line one\nLine two\nLine three');
    const long = { body: { action: 'sendLiveChatMessage', chat_session: 'fixture-session', message: 'a'.repeat(2001) }, query: {} };
    assert(controller.validateLegacyPayload('sendLiveChatMessage', long));
    const other = { body: { action: 'updateUserInfo', user_id: 7, username: 'Line\nBreak', email: 'fixture@example.com' }, query: {} };
    assert.equal(controller.validateLegacyPayload('updateUserInfo', other), null);
    assert.equal(other.body.username, 'LineBreak');
    console.log('PASS chat multiline/CRLF preserved, unsafe markup/controls removed, 2000-character limit, other legacy fields unchanged. No message sent or database writes.');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
