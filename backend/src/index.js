require('dotenv').config();
const app = require('./app');
const db = require('./db');

const PORT = parseInt(process.env.PORT || '5050', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  await db.initialize();

  const server = app.listen(PORT, HOST, () => {
    console.log(`========================================================`);
    console.log(`🚀 [Backend Tier] E-Commerce API Service`);
    console.log(`🌐 API Endpoint:  http://${HOST}:${PORT}/api/products`);
    console.log(`🩺 Health Check:  http://${HOST}:${PORT}/health`);
    console.log(`📊 Metrics:       http://${HOST}:${PORT}/metrics`);
    console.log(`📦 Environment:   ${process.env.NODE_ENV || 'development'}`);
    console.log(`========================================================`);
  });

  const shutdown = (signal) => {
    console.log(`\n[Backend] Caught ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[Backend] HTTP server closed.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[Backend] Forced termination due to timeout.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Backend Fatal] Failed to initialize:', err);
  process.exit(1);
});
