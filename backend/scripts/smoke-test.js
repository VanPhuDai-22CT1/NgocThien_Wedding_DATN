// Integration checks against the running local API. Only this run's fixtures are removed.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const base = process.env.TEST_API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const prefix = `qa_${randomUUID().slice(0, 8)}`;
const password = `Test-${randomUUID()}`;
let checks = 0;
const ids = { users: [], products: [], orders: [], consultations: [] };

async function request(endpoint, { method = 'GET', token, body, expected = 200 } = {}) {
  const response = await fetch(`${base}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${endpoint}: ${JSON.stringify(data)}`);
  checks++;
  return data;
}

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ngocthienwedding',
  });
  try {
    const credentials = (name) => ({ username: `${prefix}_${name}`, email: `${prefix}_${name}@example.com`, password, confirmPassword: password, phone: '0901234567', address: 'QA address' });
    for (const name of ['user', 'other', 'admin']) {
      const result = await request('/auth/register', { method: 'POST', body: credentials(name), expected: 201 });
      ids.users.push(result.data.user_id);
    }
    await db.execute('UPDATE users SET role = ? WHERE id = ?', ['admin', ids.users[2]]);
    const login = async (name) => (await request('/auth/login', { method: 'POST', body: credentials(name) })).data.token;
    const user = await login('user');
    const other = await login('other');
    const admin = await login('admin');
    const me = await request('/auth/me', { token: user });
    assert.equal(me.data.phone, '0901234567');
    assert.equal(me.data.address, 'QA address');
    await request('/auth/register', { method: 'POST', body: { ...credentials('user'), email: `${prefix}_duplicate@example.com` }, expected: 409 });
    await request('/auth/login', { method: 'POST', body: { email: credentials('user').email, password: 'wrong' }, expected: 401 });
    await request('/auth/register', { method: 'POST', body: { ...credentials('invalid'), password: '123', confirmPassword: '123' }, expected: 400 });

    const product = (await request('/products', { method: 'POST', token: admin, body: { name: prefix, price: 120000, stock: 10 } , expected: 201 })).data;
    ids.products.push(product.id);
    await request('/products?page=1&limit=2');
    await request('/products?limit=-1', { expected: 400 });
    await request(`/products/${product.id}`);
    await request(`/reviews/product/${product.id}`);
    await request('/cart', { expected: 401 });
    await request('/cart', { method: 'POST', token: user, body: { productId: product.id, quantity: 2 } });
    const cart = await request('/cart', { token: user });
    assert.equal(cart.data[0].quantity, 2);
    await request(`/cart/${cart.data[0].id}`, { method: 'PUT', token: user, body: { quantity: 0.5 }, expected: 400 });
    await request(`/cart/${cart.data[0].id}`, { method: 'DELETE', token: other, expected: 403 });

    const eventDate = new Date(Date.now() + 10 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const orderBody = { user_id: ids.users[1], customer_name: prefix, event_date: eventDate, note: 'QA booking note', items: [{ product_id: product.id, quantity: 2 }], payment_method: 'cash', phone: '0901234567' };
    await request('/orders', { method: 'POST', token: user, body: { ...orderBody, items: [{ product_id: product.id, quantity: -1 }] }, expected: 400 });
    const order = await request('/orders', { method: 'POST', token: user, body: orderBody, expected: 201 });
    ids.orders.push(order.data.order_id);
    await request(`/reviews/product/${product.id}/eligibility`, { expected: 401 });
    assert.equal((await request(`/reviews/product/${product.id}/eligibility`, { token: user })).data.canReview, false);
    await request('/reviews', { method: 'POST', token: user, body: { productId: product.id, rating: 5 }, expected: 403 });
    assert.equal((await request(`/reviews/product/${product.id}/eligibility`, { token: other })).data.canReview, false);
    await request('/reviews', { method: 'POST', token: other, body: { productId: product.id, rating: 5, userid: ids.users[0] }, expected: 403 });
    await db.execute('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', ids.orders[0]]);
    assert.equal((await request(`/reviews/product/${product.id}/eligibility`, { token: user })).data.canReview, false);
    await request('/reviews', { method: 'POST', token: user, body: { productId: product.id, rating: 5 }, expected: 403 });
    await db.execute('UPDATE orders SET status = ? WHERE id = ?', ['confirmed', ids.orders[0]]);
    assert.equal((await request(`/reviews/product/${product.id}/eligibility`, { token: user })).data.canReview, true);
    const detail = await request(`/orders/${ids.orders[0]}`, { token: user });
    assert.equal(detail.data.user_id, ids.users[0]);
    assert.equal(detail.data.event_date, eventDate);
    assert.equal(detail.data.note, orderBody.note);
    assert.equal(detail.data.customer_name, prefix);
    assert.equal(Number(detail.data.total_amount), 240000);
    assert.equal(detail.data.OrderItems.length, 1);
    const secondOrder = await request('/orders', { method: 'POST', token: user, body: orderBody, expected: 201 });
    ids.orders.push(secondOrder.data.order_id);
    await request('/orders', { method: 'POST', token: user, body: orderBody, expected: 409 });
    await request(`/orders/${ids.orders[0]}`, { token: other, expected: 403 });
    await request(`/orders/user/${ids.users[0]}`, { token: other, expected: 403 });
    await request(`/orders/user/${ids.users[0]}`, { token: user });
    await request('/orders?page=1&limit=2', { token: admin });
    await request(`/orders/${ids.orders[0]}/status`, { method: 'PUT', token: user, body: { status: 'delivered' }, expected: 403 });
    await request(`/orders/${ids.orders[0]}/status`, { method: 'PUT', token: admin, body: { status: 'delivered' } });
    const stats = await request('/legacy?action=getDashboardStats', { token: admin });
    assert.equal(stats.months.length, 12);
    assert.equal(stats.monthly_revenue.length, 12);
    await request('/reviews', { method: 'POST', token: user, body: { productId: product.id, rating: 5, comment: prefix }, expected: 201 });
    assert.equal((await request(`/reviews/product/${product.id}/eligibility`, { token: user })).data.reason, 'already_reviewed');
    await request('/reviews', { method: 'POST', token: user, body: { productId: product.id, rating: 5 }, expected: 409 });

    for (const action of ['getUsers', 'getConsultations', 'getLiveChatSessions', 'getDashboardStats', 'getOrders', 'getActivityLogs']) {
      await request(`/legacy?action=${action}`, { expected: 401 });
      await request(`/legacy?action=${action}`, { token: admin });
    }
    await request(`/legacy?action=getUser&user_id=${ids.users[0]}`, { token: other, expected: 403 });
    await request(`/legacy?action=getUser&user_id=${ids.users[0]}`, { token: user });
    await request(`/legacy?action=getOrder&id=${ids.orders[0]}`, { token: other, expected: 403 });
    const consultation = await request('/legacy', { method: 'POST', body: { action: 'addConsultation', name: prefix, email: credentials('user').email, phone: '0901234567', service: 'Wedding', event_date: eventDate } });
    ids.consultations.push(consultation.data.id);
    const quoteBody = { product_id: product.id, name: prefix, phone: '0901234567', event_date: eventDate, location: 'QA quote address', scale: '20 tables', note: 'QA quote note', color: 'Hồng pastel' };
    await request('/consultations/quote', { method: 'POST', body: { ...quoteBody, phone: '123' }, expected: 400 });
    await request('/consultations/quote', { method: 'POST', body: { ...quoteBody, event_date: '2020-01-01' }, expected: 400 });
    await request('/consultations/quote', { method: 'POST', body: { ...quoteBody, product_id: 'mau-demo' }, expected: 400 });
    const savedQuote = await request('/consultations/quote', { method: 'POST', token: user, body: quoteBody, expected: 201 });
    ids.consultations.push(savedQuote.data.id);
    const [quoteRows] = await db.execute('SELECT * FROM consultations WHERE id = ?', [savedQuote.data.id]);
    assert.equal(quoteRows[0].status, 'pending');
    assert.equal(quoteRows[0].user_id, ids.users[0]);
    assert(quoteRows[0].note.includes(quoteBody.location));
    assert(quoteRows[0].note.includes(quoteBody.scale));
    const ownConsultations = await request('/legacy?action=getConsultations', { token: user });
    assert(ownConsultations.data.some((row) => row.id === consultation.data.id));
    const othersConsultations = await request('/legacy?action=getConsultations', { token: other });
    assert(!othersConsultations.data.some((row) => row.id === consultation.data.id));
    await request('/legacy', { method: 'POST', token: other, body: { action: 'updateConsultation', id: consultation.data.id, name: 'Forbidden' }, expected: 403 });
    await request('/legacy', { method: 'POST', token: user, body: { action: 'updateConsultation', id: consultation.data.id, name: prefix } });
    await request('/legacy', { method: 'POST', token: admin, body: { action: 'updateConsultationStatus', id: consultation.data.id, status: 'đang giao' } });
    await request('/consultations?page=1&limit=2', { token: admin });
    const dates = await request('/consultations/booked-dates');
    assert(dates.data.some((row) => row.event_date === eventDate));
    await request('/legacy', { method: 'POST', body: { action: 'sendLiveChatMessage', chat_session: prefix, sender: 'customer', message: prefix } });
    await request(`/legacy?action=getLiveChatMessages&chat_session=${prefix}`);
    await request('/legacy', { method: 'POST', body: { action: 'sendLiveChatMessage', chat_session: prefix, sender: 'admin', message: prefix }, expected: 401 });
    await request('/chat/message', { method: 'POST', body: { chat_session: prefix, sender_type: 'admin', message: prefix }, expected: 401 });
    const configured = (await request('/products', { method: 'POST', token: admin, expected: 201, body: {
      name: `${prefix}_packages`, price: 100000, service_details: JSON.stringify({ unit: 'gói', colors: ['Đỏ truyền thống'], packages: [{ id: 'standard', name: 'Tiêu chuẩn', price: 3500000 }, { id: 'premium', name: 'Cao cấp', price: 5500000 }, { id: 'survey', name: 'Theo khảo sát', price: 0 }] }),
    } })).data;
    ids.products.push(configured.id);
    assert.equal((await request(`/reviews/product/${configured.id}/eligibility`, { token: user })).data.canReview, false);
    await request('/reviews', { method: 'POST', token: user, body: { productId: configured.id, rating: 5 }, expected: 403 });
    const selection = { package_id: 'standard', color: 'Đỏ truyền thống', event_date: '2038-05-19', location: 'Địa điểm kiểm thử', note: 'Giữ hoa đỏ và phụ kiện vàng' };
    const addSelection = (value, expected = 200) => request('/cart', { method: 'POST', token: user, expected, body: { productId: configured.id, quantity: 1, price: 1, selection: value } });
    await addSelection({}, 400);
    await addSelection({ ...selection, package_id: 'invalid' }, 400);
    await addSelection({ ...selection, color: 'invalid' }, 400);
    await addSelection({ ...selection, event_date: '2000-01-01' }, 400);
    await addSelection({ ...selection, package_id: 'survey' }, 400);
    await addSelection(selection);
    await addSelection(selection);
    await addSelection({ ...selection, package_id: 'premium' });
    await addSelection({ ...selection, event_date: '2038-05-20' });
    const selectedCart = (await request('/cart', { token: user })).data.filter((item) => item.productId === configured.id);
    assert.equal(selectedCart.length, 3);
    const standard = selectedCart.find((item) => item.selection.package_id === 'standard' && item.selection.event_date === selection.event_date);
    assert.equal(standard.quantity, 2);
    assert.equal(standard.price, 3500000);
    assert.equal(standard.selection.location, selection.location);
    assert.equal(standard.selection.note, selection.note);
    await request(`/cart/${standard.id}`, { method: 'PUT', token: user, body: { quantity: 1000 }, expected: 400 });
    const selectedOrder = await request('/orders', { method: 'POST', token: user, expected: 201, body: { ...orderBody, event_date: selection.event_date, items: [{ product_id: configured.id, quantity: 2, price: 1, selection: { ...selection, package_id: 'premium' } }] } });
    ids.orders.push(selectedOrder.data.order_id);
    assert.equal(Number(selectedOrder.data.total_amount), 11000000);
    const savedOrder = (await request(`/orders/${selectedOrder.data.order_id}`, { token: user })).data;
    assert.equal(savedOrder.OrderItems[0].selection.package_name, 'Cao cấp');
    assert.equal(savedOrder.OrderItems[0].selection.note, selection.note);
    assert.equal(savedOrder.OrderItems[0].selection.unit, 'gói');
    await request('/homepage-config');
    await request(`/cart/user/${ids.users[0]}`, { method: 'DELETE', token: user });
    console.log(`PASS: ${checks} API checks; authentication, permissions, products, cart, orders, reviews, consultations, chat and homepage.`);
  } finally {
    await db.execute('DELETE FROM live_chat_messages WHERE chat_session = ?', [prefix]);
    await db.execute('DELETE FROM live_chat_sessions WHERE chat_session = ?', [prefix]);
    for (const id of ids.consultations) await db.execute('DELETE FROM consultations WHERE id = ?', [id]);
    for (const id of ids.products) await db.execute('DELETE FROM product_reviews WHERE product_id = ?', [id]);
    for (const id of ids.orders) {
      await db.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
      await db.execute('DELETE FROM orders WHERE id = ?', [id]);
    }
    for (const id of ids.users) {
      await db.execute('DELETE FROM shopping_carts WHERE user_id = ?', [id]);
      await db.execute('DELETE FROM users WHERE id = ?', [id]);
    }
    for (const id of ids.products) await db.execute('DELETE FROM products WHERE id = ?', [id]);
    await db.end();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
