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

  await t.test('GET / should serve the React application bundle', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.match(res.text, /<!DOCTYPE html>/i);
    assert.match(res.text, /id="root"/);
    assert.match(res.text, /NovaStore/);
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

test('Tier 1: React Component & Architecture Integrity Suite', async (t) => {
  const headerCode = fs.readFileSync(path.join(__dirname, '../src/components/Header.jsx'), 'utf8');
  const cartCode = fs.readFileSync(path.join(__dirname, '../src/components/CartModal.jsx'), 'utf8');
  const categoryCode = fs.readFileSync(path.join(__dirname, '../src/components/CategoryFilter.jsx'), 'utf8');
  const cardCode = fs.readFileSync(path.join(__dirname, '../src/components/ProductCard.jsx'), 'utf8');
  const appCode = fs.readFileSync(path.join(__dirname, '../src/App.jsx'), 'utf8');

  await t.test('Header.jsx contains all 2-tier telemetry indicator IDs', () => {
    assert.ok(headerCode.includes('id="backend-dot"'));
    assert.ok(headerCode.includes('id="backend-status-text"'));
    assert.ok(headerCode.includes('Tier 1:'));
    assert.ok(headerCode.includes('Tier 2:'));
    assert.ok(headerCode.includes('href="/health"'));
    assert.ok(headerCode.includes('http://localhost:5001/metrics'));
  });

  await t.test('CartModal.jsx contains checkout form controls and modal IDs', () => {
    assert.ok(cartCode.includes('id="cart-modal"'));
    assert.ok(cartCode.includes('id="checkout-form"'));
    assert.ok(cartCode.includes('id="cust-name"'));
    assert.ok(cartCode.includes('id="cust-email"'));
    assert.ok(cartCode.includes('id="checkout-btn"'));
  });

  await t.test('CategoryFilter.jsx defines category chips', () => {
    assert.ok(categoryCode.includes('id="category-chips"'));
    assert.ok(categoryCode.includes('Electronics'));
    assert.ok(categoryCode.includes('Wearables'));
    assert.ok(categoryCode.includes('Computers'));
  });

  await t.test('ProductCard.jsx renders product pricing and cart button', () => {
    assert.ok(cardCode.includes('product-card'));
    assert.ok(cardCode.includes('product-price'));
    assert.ok(cardCode.includes('stock-badge'));
  });

  await t.test('App.jsx connects to /api/products, /api/orders, and /health', () => {
    assert.ok(appCode.includes('/api/products'));
    assert.ok(appCode.includes('/api/orders'));
    assert.ok(appCode.includes('/health'));
  });
});

test('Tier 1: Production Build Assets Suite', async (t) => {
  const distDir = path.join(__dirname, '../dist');
  await t.test('Vite dist directory contains compiled HTML and hashed assets', () => {
    assert.ok(fs.existsSync(distDir), 'dist directory must exist');
    assert.ok(fs.existsSync(path.join(distDir, 'index.html')), 'dist/index.html must exist');
    const assetsDir = path.join(distDir, 'assets');
    assert.ok(fs.existsSync(assetsDir), 'dist/assets must exist');
    const assetFiles = fs.readdirSync(assetsDir);
    assert.ok(assetFiles.some((f) => f.endsWith('.js')), 'dist/assets must contain .js bundle');
    assert.ok(assetFiles.some((f) => f.endsWith('.css')), 'dist/assets must contain .css stylesheet');
  });
});
