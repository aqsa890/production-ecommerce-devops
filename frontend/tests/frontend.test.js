const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('./test-helper');
const app = require('../server');

test('Tier 1: Frontend Server & Observability Suite', async (t) => {
  await t.test('GET /health should return 200 UP and tier metadata', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'UP');
    assert.equal(res.body.tier, 'frontend-web');
    assert.ok(res.body.timestamp);
    assert.equal(typeof res.body.uptimeSeconds, 'number');
    assert.ok(res.body.backend);
    assert.ok(res.body.backend.url);
  });

  await t.test('GET / should serve the HTML storefront', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.match(res.text, /<!DOCTYPE html>/i);
    assert.match(res.text, /NovaStore/);
    assert.match(res.text, /Tier 1:/);
    assert.match(res.text, /Tier 2:/);
    assert.match(res.text, /Tier 3:/);
  });

  await t.test('GET /style.css should serve the frontend stylesheet', async () => {
    const res = await request(app).get('/style.css');
    assert.equal(res.status, 200);
    assert.match(res.text, /--primary/);
    assert.match(res.text, /\.product-card/);
  });

  await t.test('GET /script.js should serve the frontend client script', async () => {
    const res = await request(app).get('/script.js');
    assert.equal(res.status, 200);
    assert.match(res.text, /checkThreeTierHealth/);
    assert.match(res.text, /fetchProducts/);
    assert.match(res.text, /addToCart/);
  });
});

test('Tier 1: API Proxy & Resilience Suite', async (t) => {
  await t.test('GET /api/products returns 502 gracefully if backend is offline', async () => {
    const res = await request(app).get('/api/products');
    // If backend is running it returns 200; if offline it must return 502 without crashing
    assert.ok([200, 502].includes(res.status));
    if (res.status === 502) {
      assert.equal(res.body.success, false);
      assert.ok(res.body.error);
    } else {
      assert.equal(res.body.success, true);
    }
  });
});

test('Tier 1: UI DOM & Accessibility Integrity Suite', async (t) => {
  const htmlPath = path.join(__dirname, '../public/index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  await t.test('Storefront HTML contains all required 3-tier status nodes', () => {
    assert.ok(htmlContent.includes('id="backend-dot"'));
    assert.ok(htmlContent.includes('id="backend-status-text"'));
    assert.ok(htmlContent.includes('id="db-dot"'));
    assert.ok(htmlContent.includes('id="db-status-text"'));
  });

  await t.test('Storefront HTML contains required e-commerce interactive elements', () => {
    assert.ok(htmlContent.includes('id="products-grid"'));
    assert.ok(htmlContent.includes('id="search-input"'));
    assert.ok(htmlContent.includes('id="category-chips"'));
    assert.ok(htmlContent.includes('id="cart-modal"'));
    assert.ok(htmlContent.includes('id="checkout-form"'));
  });

  await t.test('Storefront HTML includes telemetry and observability links', () => {
    assert.ok(htmlContent.includes('href="/health"'));
    assert.ok(htmlContent.includes('/metrics'));
    assert.ok(htmlContent.includes('href="/api/products"'));
  });
});
