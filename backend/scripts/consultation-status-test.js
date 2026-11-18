const assert = require('node:assert/strict');
const controller = require('../dist/controllers/LegacyController').default;
const { Consultation } = require('../dist/models');
const db = require('../dist/config/database').default;
const original = Consultation.findByPk;
(async () => {
  try {
    const record = { id: 7, status: 'pending', is_read: false, async update(values) { Object.assign(this, values); } };
    Consultation.findByPk = async () => record;
    const call = async (method, body) => {
      const res = { code: 200, status(value) { this.code = value; return this; }, json(value) { this.body = value; return this; } };
      await controller[method]({ body }, res); return res;
    };
    for (const status of ['pending', 'confirmed', 'processing', 'delivering', 'completed', 'cancelled']) {
      const response = await call('updateConsultationStatus', { id: 7, status });
      assert.equal(response.code, 200); assert.equal(record.status, status);
    }
    await call('updateConsultationStatus', { id: 7, status: 'cancel' });
    assert.equal(record.status, 'cancelled');
    await call('updateConsultationStatus', { id: 7, status: 'confirmed' });
    await call('markConsultationAsRead', { id: 7 });
    assert.equal(record.is_read, true); assert.equal(record.status, 'confirmed');
    const invalid = await call('updateConsultationStatus', { id: 7, status: 'made-up' });
    assert.equal(invalid.code, 400); assert.equal(record.status, 'confirmed');
    console.log('PASS all six consultation states, pending/confirmed preserved, cancellation alias, mark-read preserves status, invalid status rejected. Model stubs; no database writes.');
  } finally { Consultation.findByPk = original; await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
