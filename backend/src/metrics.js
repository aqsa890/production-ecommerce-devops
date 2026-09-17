const client = require('prom-client');

const register = new client.Registry();

// Default Node.js system and process metrics
client.collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
});

// HTTP Requests Counter
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed by backend API',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestCounter);

// HTTP Request Duration Histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Histogram of HTTP request durations in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
register.registerMetric(httpRequestDuration);

// Business Order Counters
const orderCounter = new client.Counter({
  name: 'ecommerce_orders_total',
  help: 'Total number of orders successfully placed',
  labelNames: ['status'],
});
register.registerMetric(orderCounter);

const revenueCounter = new client.Counter({
  name: 'ecommerce_revenue_total_dollars',
  help: 'Total revenue earned from placed orders in dollars',
});
register.registerMetric(revenueCounter);

const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;

    let route = req.baseUrl + (req.route ? req.route.path : req.path);
    if (route.startsWith('/api/products/') && route !== '/api/products') {
      route = '/api/products/:id';
    }

    const statusCode = res.statusCode ? res.statusCode.toString() : 'unknown';

    httpRequestCounter.inc({ method: req.method, route, status_code: statusCode });
    httpRequestDuration.observe({ method: req.method, route, status_code: statusCode }, durationSeconds);
  });

  next();
};

module.exports = {
  register,
  metricsMiddleware,
  orderCounter,
  revenueCounter,
};
