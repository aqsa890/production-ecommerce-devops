const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('./test-helper');
const app = require('../src/app');
const db = require('../src/db');

test.before(async () => {
  await db.initialize();
});

test('Backend Observability Endpoints', async (t) => {
  await t.test('GET /health returns 200 UP and system telemetry', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'UP');
    assert.equal(res.body.tier, 'backend-api');
    assert.ok(res.body.database);
    assert.ok(res.body.memory);
  });

  await t.test('GET /metrics exposes Prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    assert.equal(res.status, 200);
    assert.match(res.text, /http_requests_total/);
  });

  await t.test('GET /api/system exposes host info', async () => {
    const res = await request(app).get('/api/system');
    assert.equal(res.status, 200);
    assert.ok(res.body.nodeVersion);
    assert.ok(res.body.platform);
  });
});

test('Backend Product & Order API Endpoints', async (t) => {
  await t.test('GET /api/products returns products list', async () => {
    const res = await request(app).get('/api/products');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });

  await t.test('GET /api/products/:id returns specific product', async () => {
    const res = await request(app).get('/api/products/1');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 1);
  });

  await t.test('POST /api/orders rejects invalid payload', async () => {
    const res = await request(app).post('/api/orders').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('POST /api/orders creates order successfully', async () => {
    const res = await request(app).post('/api/orders').send({
      customerName: 'Integration Tester',
      customerEmail: 'tester@example.com',
      items: [{ productId: 1, quantity: 1 }]
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.orderId);
  });
});
