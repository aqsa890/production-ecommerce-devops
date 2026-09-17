const express = require('express');
const cors = require('cors');
const os = require('os');
const db = require('./db');
const { register, metricsMiddleware, orderCounter, revenueCounter } = require('./metrics');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

// -----------------------------------------------------------------------------
// 1. Health & Observability Endpoints
// -----------------------------------------------------------------------------

app.get('/health', async (req, res) => {
  const dbHealth = await db.checkHealth();
  const mem = process.memoryUsage();

  const isHealthy = dbHealth.status !== 'unhealthy';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'UP' : 'DOWN',
    tier: 'backend-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    hostname: os.hostname(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: dbHealth,
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    },
  });
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// -----------------------------------------------------------------------------
// 2. E-Commerce Product & Order APIs
// -----------------------------------------------------------------------------

app.get('/api/products', async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const products = await db.getProducts(category, search);
    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/products/:id', async (req, res, next) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: `Product with ID ${req.params.id} not found`,
      });
    }
    res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/orders', async (req, res, next) => {
  try {
    const { customerName, customerEmail, items } = req.body;

    if (!customerName || !customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'customerName and customerEmail are required.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items must be a non-empty array of { productId, quantity }.',
      });
    }

    const order = await db.createOrder({ customerName, customerEmail, items });

    // Increment business metrics
    orderCounter.inc({ status: 'CONFIRMED' });
    revenueCounter.inc(order.totalAmount);

    res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      data: order,
    });
  } catch (err) {
    if (err.message && (err.message.includes('not found') || err.message.includes('Insufficient stock'))) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

app.get('/api/orders', async (req, res, next) => {
  try {
    const orders = await db.getOrders();
    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/system', (req, res) => {
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    hostname: os.hostname(),
    cpus: os.cpus().length,
    freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
    totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// -----------------------------------------------------------------------------
// 3. Failure Injection Endpoints (For DevOps Evaluation)
// -----------------------------------------------------------------------------

app.post('/api/chaos/load', (req, res) => {
  const durationMs = Math.min(parseInt(req.query.duration || '3000', 10), 10000);
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    Math.sqrt(Math.random() * 1000000);
  }
  res.json({ message: `Simulated CPU load for ${durationMs}ms.` });
});

app.get('/api/chaos/error', (req, res) => {
  res.status(500).json({
    success: false,
    error: 'Simulated 500 Internal Server Error.',
  });
});

// -----------------------------------------------------------------------------
// 4. Fallback Error Handlers
// -----------------------------------------------------------------------------

app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error('[Backend Error]', err.stack || err.message);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

module.exports = app;
