// Controller regression with isolated model stubs. No real orders or payments.
const assert = require('node:assert/strict');
const orders = require('../dist/controllers/OrderController').default;
const legacy = require('../dist/controllers/LegacyController').default;
const { Order, OrderItem, Product, Consultation } = require('../dist/models');
const sequelize = require('../dist/config/database').default;
const saved = []; let nextId = 1;
const originals = [];
const mock = (object, key, fn) => { originals.push([object, key, object[key]]); object[key] = fn; };
const call = async (method, req) => {
  const res = { code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
  await method(req, res); return res;
};
const now = Date.now;
(async () => {
 try {
  Date.now = () => Date.parse('2026-11-17T16:30:00Z'); // 23:30 in Vietnam.
  mock(Product, 'findByPk', async () => ({ id: 99, name: 'QA Wedding package', price: 4500000, service_details: {} }));
  mock(Order, 'findAll', async () => []);
  mock(Consultation, 'findAll', async () => []);
  mock(OrderItem, 'bulkCreate', async () => []);
  mock(sequelize, 'transaction', async (_options, fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  mock(Order, 'create', async data => { const record = { ...data, id: nextId++, update: async function(values) { Object.assign(this, values); } }; saved.push(record); return record; });
  mock(Order, 'findByPk', async id => saved.find(record => record.id === Number(id)));
  const body = { customer_name: 'QA Customer', phone: '0901234567', items: [{ product_id: 99, quantity: 1 }], payment_method: 'bank', payment_status: 'paid' };
  for (const date of ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-02-31']) {
    const result = await call(orders.createOrder.bind(orders), { user: { id: 7 }, body: { ...body, event_date: date } });
    assert.equal(result.code, 400, date); assert(result.body.message.includes('3 ngày'));
  }
  const oldSelection = await call(orders.createOrder.bind(orders), { user: { id: 7 }, body: { ...body, event_date: '2026-11-20', items: [{ product_id: 99, quantity: 1, selection: { event_date: '2026-11-17' } }] } });
  assert.equal(oldSelection.code, 400); assert(oldSelection.body.message.includes('3 ngày'));
  assert.equal(saved.length, 0);
  for (const method of ['bank', 'cash']) {
    const created = await call(orders.createOrder.bind(orders), { user: { id: 7 }, body: { ...body, event_date: '2026-11-20', payment_method: method, items: [{ product_id: 99, quantity: 1, selection: { event_date: '2026-11-20' } }] } });
    assert.equal(created.code, 201); const record = saved.at(-1);
    assert.equal(record.status, 'pending'); assert.equal(record.payment_status, 'pending');
    const approved = await call(orders.updateOrderStatus.bind(orders), { params: { id: record.id }, body: { status: 'confirmed', payment_status: 'paid' } });
    assert.equal(approved.code, 200); assert.equal(record.status, 'confirmed'); assert.equal(record.payment_status, 'pending');
    await call(legacy.updateStatus.bind(legacy), { body: { order_id: record.id, status: 'processing' } });
    assert.equal(record.status, 'processing'); assert.equal(record.payment_status, 'pending');
    await call(legacy.updateStatus.bind(legacy), { body: { order_id: record.id, status: 'confirmed' } });
    assert.equal(record.status, 'confirmed'); assert.equal(record.payment_status, 'pending');
  }
  Order.findAll = async () => saved;
  const listed = await call(legacy.getOrders.bind(legacy), {});
  assert(listed.body.orders.every(order => order.payment_status === 'pending' && order.status === 'confirmed'));
  // Status changes preserve a payment that was actually recorded previously.
  saved[0].payment_status = 'paid';
  await call(orders.updateOrderStatus.bind(orders), { params: { id: saved[0].id }, body: { status: 'delivered' } });
  assert.equal(saved[0].payment_status, 'paid');
  console.log('PASS: 3-day booking boundary, old per-service dates rejected, transfer/cash accepted unpaid, client cannot mark paid, REST/legacy approval preserves payment status, admin export includes payment state. No database writes.');
 } finally { Date.now = now; for (const [object, key, value] of originals.reverse()) object[key] = value; await sequelize.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
