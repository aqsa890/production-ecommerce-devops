# ⚡ NovaStore - Production-Ready 2-Tier E-Commerce Application

[![Frontend](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Backend](https://img.shields.io/badge/Backend-Node.js_Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Monitoring](https://img.shields.io/badge/Observability-Prometheus_Ready-E6522C?style=flat-square&logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Automated Tests](https://img.shields.io/badge/Tests-22%20Passing%20(100%25)-success?style=flat-square&logo=checkmarx&logoColor=white)](#-automated-testing)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

A clean, modular, and production-grade **2-Tier E-Commerce Web & API Application** built with **React 18, Vite, Node.js, and Express**. Engineered specifically for **DevOps practical testing, CI/CD pipeline automation, containerization, observability, and disaster recovery**.

---

## 🏗️ 2-Tier Architecture Overview

```mermaid
flowchart LR
    subgraph Tier1["Tier 1: React Web Storefront"]
        UI["React 18 + Vite SPA\n(Port 3000)\nComponent-based UI & Proxy Server"]
    end

    subgraph Tier2["Tier 2: Node.js Backend API"]
        API["Express API Server\n(Port 5001)\nBusiness Logic & Telemetry"]
        Metrics["Prometheus Exporter\n(/metrics)"]
        Health["Health Diagnostics\n(/health)"]
        Data[("In-Memory Store /\nPostgreSQL Connector\n(backend/db/seed.sql)")]
    end

    User([Web Browser / Client]) -->|HTTP :3000| UI
    UI -->|Internal Proxy /api/*| API
    API --> Data
    API --> Metrics
    API --> Health
```

### The Two Tiers
1. **Tier 1 (Frontend):** Modern, interactive Single Page Application (SPA) built with **React 18 and Vite**. Features modular components (`Header`, `CategoryFilter`, `ProductCard`, `CartModal`, `Toast`), live 2-Tier health telemetry indicators, and an Express server on **Port 3000** with an internal `/api/*` reverse proxy. Zero unnecessary public folders—all assets are bundled via Vite.
2. **Tier 2 (Backend):** High-performance Express.js REST API on **Port 5001**. Handles product catalog queries, atomic order creation, Prometheus metrics collection (`/metrics`), and comprehensive health checks (`/health`). Includes built-in database schemas and seed data (`backend/db/seed.sql`) with a seamless in-memory fallback.

---

## 📁 Repository Directory Structure

```
├── backend/                           # [Tier 2: Node.js Backend API Service]
│   ├── src/
│   │   ├── index.js                   # Server bootstrap & graceful shutdown (Port 5001)
│   │   ├── app.js                     # Express app, middleware & route definitions
│   │   ├── db.js                      # Database service + PostgreSQL / in-memory fallback
│   │   └── metrics.js                 # Prometheus prom-client metrics configuration
│   ├── db/
│   │   └── seed.sql                   # Database schema, indexes & mock products/orders
│   ├── tests/
│   │   ├── test-helper.js             # Socket-free in-memory request dispatcher
│   │   └── api.test.js                # 9 automated backend API integration tests
│   ├── package.json                   # Backend dependencies & test scripts
│   └── .env.example                   # Backend environment configuration template
│
├── frontend/                          # [Tier 1: React 18 Web Storefront UI]
│   ├── src/                           # React Component Architecture
│   │   ├── components/
│   │   │   ├── Header.jsx             # Top 2-tier telemetry bar, search, cart toggle
│   │   │   ├── CategoryFilter.jsx     # Responsive category chips
│   │   │   ├── ProductCard.jsx        # Product display card with stock badge
│   │   │   ├── CartModal.jsx          # Shopping cart drawer & checkout form
│   │   │   └── Toast.jsx              # Animated feedback alerts
│   │   ├── App.jsx                    # Root state manager (catalog, cart, health)
│   │   ├── main.jsx                   # React DOM bootstrap
│   │   └── index.css                  # Responsive styles & animations
│   ├── tests/
│   │   ├── test-helper.js             # In-memory stream dispatcher for frontend
│   │   └── frontend.test.js           # 13 automated frontend tests
│   ├── index.html                     # Vite entry HTML
│   ├── vite.config.js                 # Vite bundler & backend proxy config
│   ├── server.js                      # Production static server & proxy (Port 3000)
│   ├── package.json                   # React & Vite dependencies
│   └── .env.example                   # Frontend environment configuration template
│
├── ARCHITECTURE_DESIGN.md             # Complete DevOps architectural design specification
└── README.md                          # Master documentation & quick-start guide
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher

---

### Step 1: Start Backend API (Port 5001)
```bash
cd backend
npm install
npm start
```
- 🌐 **API Base:** `http://localhost:5001/api/products`
- 🩺 **Health Check:** `http://localhost:5001/health`
- 📊 **Prometheus Metrics:** `http://localhost:5001/metrics`

---

### Step 2: Start Frontend Storefront (Port 3000)
Open a new terminal window:
```bash
cd frontend
npm install

# For local development with Hot Module Replacement (HMR):
npm run dev

# Or build and start production server:
npm run build
npm start
```
- 🛒 **Storefront URL:** `http://localhost:3000`
- 🩺 **Frontend Health:** `http://localhost:3000/health`

Open [http://localhost:3000](http://localhost:3000) in your browser to view the React storefront and observe the real-time **2-Tier Status Bar** at the top.

---

## 🧪 Automated Testing

Both tiers include dedicated, automated test suites built with Node.js's native test runner (`node --test`), requiring zero external test runners and executing in under 1 second.

### Run All Tests:
```bash
# 1. Run Backend API Tests (9 tests)
cd backend && npm test

# 2. Run Frontend React Tests (13 tests)
cd ../frontend && npm test
```

### Test Suite Breakdown:
| Tier | Test File | Tests Passed | Coverage Highlights |
| :--- | :--- | :---: | :--- |
| **Backend** | `backend/tests/api.test.js` | **9 / 9** | `/health` status & telemetry, `/metrics` format, `/api/system`, product retrieval, single product 404, order input validation, successful order placement |
| **Frontend** | `frontend/tests/frontend.test.js` | **13 / 13** | `/health` diagnostics, React SPA bundle delivery, Vite `dist` assets validation, proxy 502 error resilience, DOM 3-tier indicator presence, component architecture integrity |
| **Total** | | **22 / 22** | **100% Passing** |

---

## 📡 API Endpoints Reference

| Method | Endpoint | Tier | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/health` | Frontend & Backend | Returns service uptime, memory usage, and dependency connectivity |
| `GET` | `/metrics` | Backend | Prometheus metrics scrape target (request counters, duration histograms) |
| `GET` | `/api/products` | Backend (Proxied) | List all products (supports `?category=Electronics` and `?search=headphone`) |
| `GET` | `/api/products/:id` | Backend (Proxied) | Retrieve a single product by numeric ID |
| `POST` | `/api/orders` | Backend (Proxied) | Create a new customer order (`{ customerName, customerEmail, items }`) |
| `GET` | `/api/orders` | Backend (Proxied) | Retrieve list of recent customer orders |
| `GET` | `/api/system` | Backend | Hardware metadata, CPU count, memory, architecture |
| `POST` | `/api/chaos/load` | Backend | Simulates high CPU spike (`?duration=3000`) for testing Prometheus alerts |
| `GET` | `/api/chaos/error` | Backend | Simulates HTTP 500 error for testing error-rate threshold alerts |

---

## ⚙️ Environment Variables Reference

### Backend Configuration (`backend/.env`):
| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5001` | Port for the backend API server |
| `HOST` | `0.0.0.0` | Host binding address (prevents `127.0.0.1` container isolation traps) |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | Database username |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_NAME` | `ecommerce` | Database name |
| `DATABASE_URL` | *(Optional)* | Direct PostgreSQL connection string |

### Frontend Configuration (`frontend/.env`):
| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the frontend storefront server |
| `HOST` | `0.0.0.0` | Host binding address |
| `BACKEND_URL` | `http://localhost:5001` | Address of the backend API service for proxying |

---

## 🛡️ DevOps & Reliability Highlights

- **Host Traps Avoided:** Express servers bind to `0.0.0.0`, eliminating common Docker bridge and container networking failure modes.
- **Observability Native:** Ready for immediate scraping by **Prometheus** via `/metrics` and status polling by **Nginx** via `/health`.
- **Fault-Tolerant Boot:** If PostgreSQL is unreachable or still starting up, the backend gracefully degrades to an in-memory catalog without crashing.
- **Chaos Injection Built-In:** Dedicated endpoints allow DevOps engineers to trigger CPU burns and HTTP 500 spikes to test alerting rules without modifying code.
- **Zero Socket Clashes in CI:** Tests use custom in-memory stream dispatchers, allowing test suites to pass cleanly even inside restricted sandboxes or air-gapped CI runners.

---

## 📄 License
This project is licensed under the MIT License.
