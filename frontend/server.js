require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

app.use(cors());
app.use(express.json());

// Health Check for Frontend Web Tier
app.get('/health', async (req, res) => {
  let backendReachable = false;
  let backendData = null;

  try {
    const backendRes = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(2000) });
    backendReachable = backendRes.ok;
    backendData = await backendRes.json();
  } catch (err) {
    backendReachable = false;
  }

  res.json({
    status: 'UP',
    tier: 'frontend-web',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    backend: {
      url: BACKEND_URL,
      connected: backendReachable,
      details: backendData,
    },
  });
});

// Proxy /api requests to Backend Tier
app.all('/api/*', async (req, res) => {
  const targetUrl = `${BACKEND_URL}${req.originalUrl}`;
  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const backendRes = await fetch(targetUrl, fetchOptions);
    const data = await backendRes.json();
    return res.status(backendRes.status).json(data);
  } catch (err) {
    console.error(`[Frontend Proxy Error] Failed calling ${targetUrl}:`, err.message);
    return res.status(502).json({
      success: false,
      error: `Failed to connect to Backend API at ${BACKEND_URL}`,
      details: err.message,
    });
  }
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all for SPA/front page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`========================================================`);
    console.log(`⚡ [Frontend Tier] Web Storefront running`);
    console.log(`🌐 UI URL:        http://${HOST}:${PORT}`);
    console.log(`🩺 Health:        http://${HOST}:${PORT}/health`);
    console.log(`🔗 Backend Proxy: ${BACKEND_URL}`);
    console.log(`========================================================`);
  });
}

module.exports = app;
