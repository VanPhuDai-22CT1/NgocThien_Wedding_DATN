// Read-only controller regression with model stubs; never writes database records.
const assert = require('node:assert/strict');
const legacy = require('../dist/controllers/LegacyController').default;
const { User, Product, Order, Consultation } = require('../dist/models');
const db = require('../dist/config/database').default;
const originals = [];
const mock = (model, method, fn) => { originals.push([model, method, model[method]]); model[method] = fn; };
async function snapshot() {
  const response = { json(value) { this.body = value; return this; } };
  await legacy.getDashboardStats({}, response);
  return response.body;
}
(async () => {
  try {
    let populated = true;
    mock(User, 'count', async options => populated ? (options?.where?.role === 'user' ? 998 : 1000) : 0);
    mock(Product, 'count', async () => populated ? 236 : 0);
    mock(Consultation, 'count', async () => populated ? 147 : 0);
    // List and aggregate orders must describe the same snapshot.
    mock(Order, 'count', async () => { throw Error('Separate order count is not the snapshot'); });
    mock(Order, 'findAll', async () => populated ? [
      { status: 'pending', total_amount: 500000, payment_status: 'pending' },
      { status: 'confirmed', total_amount: 1000000, payment_status: 'pending', payment_method: 'bank' },
      { status: 'cancelled', total_amount: 1000000, payment_status: 'pending' },
    ] : []);
    const data = await snapshot();
    assert.deepEqual([data.total_users, data.total_customers, data.total_products, data.total_orders, data.total_consultations], [1000, 998, 236, 3, 147]);
    assert.equal(data.pending_orders + data.completed_orders + data.cancelled_orders, data.total_orders);
    assert.equal(data.total_revenue, 0);
    assert.equal(data.online_payment_revenue, 0);
    assert(Number.isFinite(Date.parse(data.generated_at)));
    populated = false;
    const empty = await snapshot();
    for (const key of ['total_users', 'total_customers', 'total_products', 'total_orders', 'total_consultations']) assert.equal(empty[key], 0, key);
    console.log('PASS dashboard database totals, customer breakdown, order snapshot, real zero counts and unpaid revenue. No database writes.');
  } finally {
    for (const [model, method, original] of originals.reverse()) model[method] = original;
    await db.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
