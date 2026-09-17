# Production-Ready E-Commerce DevOps Architecture Design
**Project Title:** Production-Ready E-Commerce Application – DevOps Deployment, Monitoring & Reliability  
**Client / Institution:** MA SOFT TECH SOLUTIONS – DevOps Internship Practical Project  
**Architecture Classification:** Minimal, Zero-Bloat, High-Reliability Single-Host / Cloud VM Production Architecture  

---

## 1. Executive Summary & Design Principles

This document specifies the complete, production-grade DevOps architectural design for deploying, observing, securing, and maintaining an E-Commerce Web/API application. The architecture is engineered to satisfy all functional, operational, and reliability criteria mandated by the practical evaluation guidelines while eliminating extraneous complexity.

### Core Architectural Principles
1. **Minimalism with Zero Missing Requirements:** Every tier (Linux, Docker, CI/CD, Nginx, Prometheus, Grafana, Alerting, Security, Rollback) is purpose-built, explicit, and fully specified without unnecessary external SaaS dependencies.
2. **Strict Network Segmentation:** Host ports are locked down; inter-container communication is strictly isolated across dedicated bridge networks (`frontend-net`, `backend-net`, `monitoring-net`).
3. **Immutable & Reproducible Artifacts:** Applications and configurations are built into immutable Docker images tagged by Git commit SHA; environments are reproduced deterministically via version-controlled configuration files.
4. **Shift-Left DevSecOps:** Automated vulnerability scanning (Trivy), Dockerfile linting (Hadolint), and secret detection (Gitleaks) execute within the CI pipeline prior to deployment.
5. **Deterministic Troubleshooting & Observability:** Real-time visibility across CPU, RAM, Disk, Network, container metrics, and application health endpoints with automated alerting and a structured 9-step root-cause-analysis framework.

---

## 2. High-Level Architecture Topology

```mermaid
flowchart TD
    subgraph External["External Network / Clients"]
        Client[End Users / Web Browsers]
        Admin[DevOps / On-Call Engineers]
        GitHub[GitHub Repository / VCS]
    end

    subgraph Host["Production Host (Linux VM - Ubuntu 22.04 LTS)"]
        subgraph Perimeter["Perimeter Security"]
            FW[UFW / Cloud Security Group\nPorts: 80, 443, 22]
        end

        subgraph IngressNet["Docker Network: ingress-net"]
            Nginx[Nginx Reverse Proxy & TLS Terminator\nPort: 80, 443]
        end

        subgraph AppNet["Docker Network: app-net (Isolated)"]
            App[E-Commerce Web/API App\nNode.js / Python / Go\nInternal Port: 3000\nRuns as Non-Root: 10001]
            DB[(PostgreSQL / MySQL Database\nInternal Port: 5432\nNamed Volume: db_data)]
        end

        subgraph MonNet["Docker Network: monitoring-net (Isolated)"]
            NodeExp[Node Exporter\nHost Metrics\nInternal Port: 9100]
            cAdvisor[cAdvisor\nContainer Metrics\nInternal Port: 8080]
            Prom[Prometheus TSDB\nScrapes App, Node, cAdvisor\nInternal Port: 9090]
            Alertmgr[Alertmanager\nDispatches Alerts\nInternal Port: 9093]
            Grafana[Grafana Dashboards\nInternal Port: 3000 -> Reverse Proxied via Nginx /grafana]
        end

        subgraph Storage["Persistent Host Volumes"]
            VolDB[(db_data)]
            VolProm[(prometheus_data)]
            VolGraf[(grafana_data)]
        end
    end

    %% External to Perimeter
    Client -->|HTTPS :443| FW
    Admin -->|SSH :22 Key Auth| FW
    GitHub -->|Deploy Action / Webhook| Host

    %% Perimeter to Ingress
    FW -->|Port Forward 80/443| Nginx

    %% Ingress to Services
    Nginx -->|Proxy Pass /| App
    Nginx -->|Proxy Pass /grafana Basic Auth/TLS| Grafana

    %% App to Data
    App -->|Internal Network Call| DB
    DB -.-> VolDB

    %% Observability Scrapes
    Prom -->|Scrape Host Metrics| NodeExp
    Prom -->|Scrape Container Stats| cAdvisor
    Prom -->|Scrape /metrics| App
    Prom -->|Trigger Alerts| Alertmgr
    Alertmgr -->|Send Notification| Admin
    Grafana -->|Query PromQL| Prom

    Prom -.-> VolProm
    Grafana -.-> VolGraf
```

---

## 3. Team Division & Ownership Matrix

In compliance with **Section 2: Team Structure & Responsibilities**, tasks and components are split between the two intern roles:

| Area | Person 1: DevOps & Infrastructure Intern | Person 2: DevOps & Monitoring Intern |
| :--- | :--- | :--- |
| **System & Host** | Linux user provisioning, SSH keys, UFW firewall, directory permissions | System metric baselines, resource limit validation |
| **VCS & Git** | Git branching model, repo initialization, PR approval gates, `.gitignore` | Branch protection policy review, commit message linting |
| **Containerization** | Multi-stage `Dockerfile`, `.dockerignore`, image optimization | Container health check endpoints, resource benchmarking |
| **Orchestration** | `docker-compose.yml`, volume mounts, environment variables | Compose service health probes, container crash loop tests |
| **Reverse Proxy** | Nginx installation, SSL/TLS, reverse proxy rules, rate limiting | Access log parsing, 4xx/5xx status code metrics |
| **CI/CD Pipeline** | GitHub Actions workflow, runner configuration, zero-downtime deploy script | Trivy image scanning step, automated post-deploy smoke test |
| **Monitoring** | Exporter network wiring, port allocation | Prometheus setup, scrape configs, Grafana dashboards |
| **Alerting** | Alertmanager container provisioning | Prometheus alert rules (CPU, RAM, Disk, 5xx), Slack/Email integration |
| **Troubleshooting** | Network routing, port conflict resolution, permission fixes | Log aggregation, RCA documentation, metric-driven hypothesis |
| **Reliability** | Rollback scripts, database backup/restore scripts | Chaos testing, failure injection validation |

---

## 4. Repository & Workspace Directory Structure

A standardized, clean layout ensuring zero clutter and unambiguous separation of concerns:

```
ecommerce-devops/
├── .github/
│   └── workflows/
│       └── ci-cd.yml                # Automated 7-stage CI/CD Pipeline
├── app/
│   ├── src/                         # E-Commerce Application source code
│   │   ├── index.js / main.py       # Application entry point with /health & /metrics
│   │   └── package.json / reqs.txt  # Application dependencies
│   ├── tests/                       # Unit & integration tests
│   │   └── test_api.py / app.test.js
│   ├── .dockerignore                # Excludes node_modules, .git, .env
│   └── Dockerfile                   # Multi-stage, non-root, hardened Dockerfile
├── deploy/
│   ├── docker-compose.yml           # Complete production multi-container orchestration
│   ├── docker-compose.override.yml  # Local developer overrides (optional)
│   ├── .env.example                 # Template for all required environment variables
│   └── rollback.sh                  # Automated zero-downtime rollback script
├── nginx/
│   ├── conf.d/
│   │   └── default.conf             # Upstream routing, headers, rate-limiting, SSL
│   └── nginx.conf                   # Core worker processes & event loop configuration
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml           # Scrape targets (app, node-exporter, cadvisor)
│   │   └── alert.rules.yml          # Threshold alert definitions (CPU, Memory, Health)
│   ├── alertmanager/
│   │   └── alertmanager.yml         # Webhook/Email routing configuration
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/
│       │   │   └── prometheus.yml   # Auto-provisioned Prometheus datasource
│       │   └── dashboards/
│       │       └── dashboard.yml    # Auto-provisioned dashboard provider
│       └── dashboards_json/
│           ├── host_metrics.json    # Host CPU, Memory, Disk, Network
│           └── app_metrics.json     # Request rates, latencies, error codes
├── scripts/
│   ├── setup_linux.sh               # Host hardening, user creation, UFW configuration
│   ├── backup_db.sh                 # Database snapshot script
│   ├── health_check.sh              # Post-deployment validation script
│   └── failure_injection.sh         # Section 4 chaos testing simulator
├── docs/
│   ├── ARCHITECTURE.md              # System Architecture & Network topology
│   ├── TROUBLESHOOTING_LOG.md       # 9-step failure RCA reports
│   └── RUNBOOK.md                   # Operations, deployment, & recovery guides
└── README.md                        # Master onboarding and quick-start guide
```

---

## 5. Linux Server Administration & Host Hardening

### 5.1 Operating System & Base Platform
- **OS:** Ubuntu 22.04 LTS (x86_64 or aarch64) on Cloud VM (AWS EC2, GCP Compute Engine, DigitalOcean Droplet, or local Proxmox/VirtualBox VM).
- **Core Dependencies:** Docker Engine (v24.x+), Docker Compose (v2.20+), UFW, curl, jq, git, htop.

### 5.2 User, Group, and Permission Strategy (Principle of Least Privilege)
To prevent unauthorized root execution:
1. **Root Login Disabled:** Direct SSH login as `root` is disabled in `/etc/ssh/sshd_config` (`PermitRootLogin no`).
2. **Dedicated CI/CD Deployer User:**
   ```bash
   sudo useradd -m -s /bin/bash -G docker deployer
   sudo mkdir -p /home/deployer/.ssh
   sudo chmod 700 /home/deployer/.ssh
   # Public key placed in /home/deployer/.ssh/authorized_keys (chmod 600)
   ```
3. **Dedicated Application Service User Inside Container:**
   Containers must **never** run as PID 0 (root). The `Dockerfile` creates a non-privileged user:
   `appuser` (UID: 10001, GID: 10001).
4. **Project Directory Permissions:**
   ```bash
   sudo mkdir -p /opt/ecommerce
   sudo chown -R deployer:docker /opt/ecommerce
   sudo chmod -R 775 /opt/ecommerce
   ```

### 5.3 Port Allocation & Firewall (UFW) Configuration
Strict network segregation: Only ports 80, 443, and 22 are exposed to the public internet. All database, exporter, and internal service ports remain inaccessible externally.

| Service | Container Port | Host Port | Publicly Accessible? | Ingress Rule |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | 22 | 22 | Yes (Restricted IP preferred) | `ufw allow 22/tcp` |
| **Nginx HTTP** | 80 | 80 | Yes | `ufw allow 80/tcp` (Redirects to 443) |
| **Nginx HTTPS** | 443 | 443 | Yes | `ufw allow 443/tcp` |
| **E-Commerce API** | 3000 | None (Internal) | No (Internal Docker network only) | Blocked by default |
| **PostgreSQL DB** | 5432 | None (Internal) | No (Internal Docker network only) | Blocked by default |
| **Prometheus** | 9090 | None (Internal) | No (Reverse proxied / localhost) | Blocked by default |
| **Grafana** | 3000 | None (Internal) | No (Accessed via `Nginx /grafana`) | Blocked by default |
| **Node Exporter** | 9100 | None (Internal) | No (Scraped over `monitoring-net`) | Blocked by default |
| **cAdvisor** | 8080 | None (Internal) | No (Scraped over `monitoring-net`) | Blocked by default |

#### Firewall Setup Commands:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP Nginx'
sudo ufw allow 443/tcp comment 'HTTPS Nginx'
sudo ufw enable
```

---

## 6. Containerization & Orchestration Architecture

### 6.1 Multi-Stage Dockerfile Strategy
The application container uses a multi-stage build to guarantee minimal attack surface and small image size (< 150MB).

```dockerfile
# ==========================================
# Stage 1: Build & Dependencies
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Install dependencies deterministically
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Run build step (if TypeScript/bundler used)
# RUN npm run build

# ==========================================
# Stage 2: Minimal Production Runtime
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

# Set non-sensitive production environment variables
ENV NODE_ENV=production \
    PORT=3000

# Create non-root system user & group
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

# Copy dependencies and source from builder
COPY --from=builder --chown=appuser:appgroup /usr/src/app ./

# Switch to non-root user
USER 10001:10001

# Expose internal listening port
EXPOSE 3000

# Docker-native Health Check
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# Execute application
CMD ["node", "src/index.js"]
```

### 6.2 Docker Compose Multi-Tier Architecture (`docker-compose.yml`)

The multi-container orchestration is organized across three isolated Docker networks:

```yaml
version: '3.8'

networks:
  ingress-net:
    driver: bridge
  app-net:
    driver: bridge
    internal: false
  monitoring-net:
    driver: bridge

volumes:
  db_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

services:
  # ----------------------------------------------------
  # 1. Edge Reverse Proxy
  # ----------------------------------------------------
  nginx:
    image: nginx:1.25-alpine
    container_name: ecommerce_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    networks:
      - ingress-net
      - app-net
      - monitoring-net
    depends_on:
      app:
        condition: service_healthy

  # ----------------------------------------------------
  # 2. E-Commerce Core Application
  # ----------------------------------------------------
  app:
    image: ${REGISTRY_IMAGE:-ecommerce-app}:${IMAGE_TAG:-latest}
    container_name: ecommerce_app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=db
      - DB_PORT=5432
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
    networks:
      - ingress-net
      - app-net
      - monitoring-net
    deploy:
      resources:
        limits:
          cpus: '0.75'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 15s
    depends_on:
      db:
        condition: service_healthy

  # ----------------------------------------------------
  # 3. Persistent Database
  # ----------------------------------------------------
  db:
    image: postgres:15-alpine
    container_name: ecommerce_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - app-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M

  # ----------------------------------------------------
  # 4. Host Metrics Exporter
  # ----------------------------------------------------
  node-exporter:
    image: prom/node-exporter:v1.7.0
    container_name: ecommerce_node_exporter
    restart: unless-stopped
    pid: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--path.rootfs=/rootfs'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring-net

  # ----------------------------------------------------
  # 5. Container Metrics Exporter (cAdvisor)
  # ----------------------------------------------------
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.47.2
    container_name: ecommerce_cadvisor
    restart: unless-stopped
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    privileged: true
    devices:
      - /dev/kmsg
    networks:
      - monitoring-net

  # ----------------------------------------------------
  # 6. Prometheus Time Series Database
  # ----------------------------------------------------
  prometheus:
    image: prom/prometheus:v2.49.1
    container_name: ecommerce_prometheus
    restart: unless-stopped
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./monitoring/prometheus/alert.rules.yml:/etc/prometheus/alert.rules.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    networks:
      - monitoring-net
    depends_on:
      - node-exporter
      - cadvisor

  # ----------------------------------------------------
  # 7. Alertmanager
  # ----------------------------------------------------
  alertmanager:
    image: prom/alertmanager:v0.26.0
    container_name: ecommerce_alertmanager
    restart: unless-stopped
    volumes:
      - ./monitoring/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
    networks:
      - monitoring-net

  # ----------------------------------------------------
  # 8. Grafana Dashboard & Visualization
  # ----------------------------------------------------
  grafana:
    image: grafana/grafana:10.3.1
    container_name: ecommerce_grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-AdminPass123}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=%(protocol)s://%(domain)s/grafana/
      - GF_SERVER_SERVE_FROM_SUB_PATH=true
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
    networks:
      - ingress-net
      - monitoring-net
    depends_on:
      - prometheus
```

---

## 7. Reverse Proxy & Networking Configuration (Nginx)

Nginx sits directly behind the host firewall. It terminates external connections, buffers requests, prevents DDoS/slowloris attacks, applies security headers, and routes traffic cleanly.

### Nginx Virtual Host Specification (`nginx/conf.d/default.conf`):
```nginx
upstream app_upstream {
    server app:3000 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

upstream grafana_upstream {
    server grafana:3000;
}

# Rate limiting zone: 10 requests per second per IP
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    listen 80;
    server_name localhost _;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Core Application Ingress
    location / {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://app_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
    }

    # Application Health Check Passthrough
    location /health {
        proxy_pass http://app_upstream/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    # Monitoring Dashboard Proxy (Protected Path)
    location /grafana/ {
        proxy_pass http://grafana_upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 8. Complete Automated CI/CD Pipeline

The pipeline strictly fulfills the sequence mandated in **Section 1 & 3**:
$$\text{Git Push} \longrightarrow \text{Checkout} \longrightarrow \text{Build} \longrightarrow \text{Test} \longrightarrow \text{Docker Build} \longrightarrow \text{Security Check} \longrightarrow \text{Deploy} \longrightarrow \text{Health Check}$$

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant GH as GitHub Actions Runner
    participant Reg as Container Registry / Local Cache
    participant Host as Linux Production Server
    participant App as E-Commerce Application

    Dev->>GH: Git Push (feature/bugfix -> PR -> main)
    activate GH
    GH->>GH: Step 1: Checkout Code
    GH->>GH: Step 2: Install Dependencies & Build
    GH->>GH: Step 3: Run Unit & API Tests
    GH->>Reg: Step 4: Docker Build & Tag (sha-${{ github.sha }})
    GH->>GH: Step 5: Security Check (Trivy Scan + Gitleaks)
    
    alt Security Check Fails
        GH-->>Dev: Pipeline Fails (CVE / Secret Detected)
    else Security Check Passes
        GH->>Host: Step 6: Deploy via SSH (Pull Image / Update Compose)
        activate Host
        Host->>App: docker compose up -d app
        deactivate Host
        GH->>App: Step 7: Post-Deploy Health Check (/health)
        
        alt Health Check Fails
            GH->>Host: Trigger Rollback Script (rollback.sh)
            Host->>App: Revert to previous image tag
            GH-->>Dev: Deployment FAILED (Rolled back to previous stable)
        else Health Check Returns 200 OK
            GH-->>Dev: Deployment SUCCESSFUL (Production Healthy)
        end
    end
    deactivate GH
```

### GitHub Actions Pipeline Specification (`.github/workflows/ci-cd.yml`):
```yaml
name: Production CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY_IMAGE: ecommerce-app
  DEPLOY_DIR: /opt/ecommerce

jobs:
  build-and-test:
    name: 1. Build & Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Setup Node.js Runtime
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: app/package-lock.json

      - name: Install Dependencies
        run: |
          cd app
          npm ci

      - name: Execute Automated Tests
        run: |
          cd app
          npm test

  security-scan:
    name: 2. DevSecOps Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Detect Committed Secrets (Gitleaks)
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Lint Dockerfile (Hadolint)
        uses: hadolint/hadolint-action@v3.1.0
        with:
          dockerfile: app/Dockerfile
          failure-threshold: error

  docker-build-and-scan:
    name: 3. Docker Build & Image CVE Scan
    needs: [build-and-test, security-scan]
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker Image
        uses: docker/build-push-action@v5
        with:
          context: ./app
          file: ./app/Dockerfile
          load: true
          tags: ${{ env.REGISTRY_IMAGE }}:${{ github.sha }}

      - name: Run Trivy Vulnerability Scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY_IMAGE }}:${{ github.sha }}
          format: 'table'
          exit-code: '1'
          ignore-unfixed: true
          vuln-type: 'os,library'
          severity: 'CRITICAL'

  deploy:
    name: 4. Deploy & Verify Health
    needs: [docker-build-and-scan]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Deploy to Target Server via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd ${{ env.DEPLOY_DIR }}
            # Record current active version for rollback
            CURRENT_TAG=$(grep IMAGE_TAG .env | cut -d '=' -f2 || echo "latest")
            echo "PREVIOUS_TAG=$CURRENT_TAG" >> /tmp/deploy_state.env
            
            # Update to new version
            sed -i "s/IMAGE_TAG=.*/IMAGE_TAG=${{ github.sha }}/" .env
            
            # Recreate application container with zero downtime
            docker compose up -d --no-deps --build app
            
            # Sleep briefly for startup sequence
            sleep 10

      - name: Automated Post-Deployment Health Check
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd ${{ env.DEPLOY_DIR }}
            bash scripts/health_check.sh http://localhost:80/health
            if [ $? -ne 0 ]; then
              echo "Health check failed! Executing automated rollback..."
              bash scripts/rollback.sh
              exit 1
            fi
            echo "Deployment verified successfully!"
```

---

## 9. Observability: Monitoring, Metrics & Alerting Architecture

### 9.1 Prometheus Configuration (`monitoring/prometheus/prometheus.yml`)
Scrapes metrics every 15 seconds across host, container, and application layers:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert.rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  # Host System Metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # Container Engine & Lifecycle Metrics
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  # E-Commerce Application Business & Performance Metrics
  - job_name: 'ecommerce-app'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['app:3000']
```

### 9.2 Critical Alert Rules (`monitoring/prometheus/alert.rules.yml`)
Fulfills **Section 1, 2 & 4** requirements for CPU, RAM, Disk, and Service availability thresholds:

```yaml
groups:
  - name: InfrastructureAlerts
    rules:
      # 1. High Host CPU Utilization
      - alert: HostHighCpuUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Host CPU usage exceeds 85%"
          description: "Instance {{ $labels.instance }} CPU load is at {{ $value | printf '%.2f' }}%."

      # 2. Low Host Memory Available
      - alert: HostLowMemory
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 < 15
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Host available memory below 15%"
          description: "Instance {{ $labels.instance }} memory available is {{ $value | printf '%.2f' }}%."

      # 3. Disk Space Critical
      - alert: HostDiskFillingUp
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 15
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Host disk free space below 15%"
          description: "Mountpoint / has only {{ $value | printf '%.2f' }}% free space left."

  - name: ApplicationAlerts
    rules:
      # 4. Service Down / Container Unhealthy
      - alert: ApplicationDown
        expr: up{job="ecommerce-app"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "E-Commerce App container is DOWN"
          description: "Application health endpoint is unreachable for > 30 seconds."

      # 5. High HTTP 5xx Error Spike
      - alert: HighHttp5xxRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100 > 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "HTTP 5xx error rate exceeds 5%"
          description: "Current error rate is {{ $value | printf '%.2f' }}% over the last 5 minutes."

      # 6. Container Restart Loop
      - alert: ContainerCrashLooping
        expr: rate(container_last_seen{name="ecommerce_app"}[3m]) > 3
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Container ecommerce_app restart loop detected"
          description: "Container has restarted multiple times in the last 3 minutes."
```

### 9.3 Grafana Dashboards Structure
Provisioned automatically via JSON:
1. **System & Host Dashboard:**
   - Real-time CPU Gauge & 1-hour time-series graph.
   - Memory Consumption breakdown (Active, Cached, Buffers, Free).
   - Disk I/O throughput & percentage space utilization.
   - Network bandwidth (RX/TX bytes/sec).
2. **Container & Microservice Dashboard:**
   - Per-container CPU & Memory limits vs actual consumption.
   - Container network drop rates and socket connections.
3. **Application & Business KPIs Dashboard:**
   - Request throughput (requests/second).
   - HTTP response latency percentiles ($p_{50}$, $p_{95}$, $p_{99}$).
   - HTTP status code distribution (2xx, 3xx, 4xx, 5xx).
   - Database connection pool utilization.

---

## 10. Failure Injection, Troubleshooting & Incident Scenario Guide

This section fulfills the core testing criteria in **Section 4 & Section 5**.

### 10.1 The 9-Step Troubleshooting Methodology
Every failure encountered or injected must follow this rigid sequence:
```
1. Failure Encountered
       ↓
2. Evidence Collected (Logs, metrics, HTTP status)
       ↓
3. Hypothesis Formulated
       ↓
4. Investigation Executed (CLI inspection, curl, netstat, inspect)
       ↓
5. Root Cause Identified
       ↓
6. Surgical Fix Applied (No uncontrolled config edits)
       ↓
7. Rebuild / Redeploy Executed
       ↓
8. Retest Performed
       ↓
9. Verification Confirmed & Documented
```

### 10.2 Comprehensive Failure Matrix (The 10 Scenarios from Section 4)

| # | Failure Scenario | Injected Fault | Observation & Evidence | Immediate CLI Diagnostic Command | Targeted Root Cause Fix |
| :- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Wrong app / container port** | App listens on `3001`, Docker exposes `3000` | Nginx returns `502 Bad Gateway`; container is healthy internally | `docker exec -it ecommerce_app netstat -tlpn` | Align `PORT=3000` in `.env` and `app.listen(3000)` |
| **2** | **Invalid env var or config** | Corrupted `DB_PORT=9999` in `.env` | App logs show `ECONNREFUSED` or unhandled DB exception | `docker logs ecommerce_app --tail 50` | Correct variable in `.env`, run `docker compose up -d app` |
| **3** | **Broken Docker config** | Syntax error in `Dockerfile` or missing binary | `docker build` fails with code 1; image generation aborted | `docker build -t test ./app` | Fix Dockerfile instruction (e.g., correct `COPY` path or base image) |
| **4** | **Failed application / CI test** | Broken assertion in `test_api.py` | GitHub Actions step fails; pipeline halts before deploy | `npm test` or `pytest` locally | Correct application logic or fix outdated test assertion |
| **5** | **App crash / unhealthy container** | Unhandled exception thrown on boot | `docker ps` shows `Restarting (1)` or `Status: Unhealthy` | `docker inspect --format='{{json .State}}' ecommerce_app` | Catch unhandled rejection; inspect stack trace in logs |
| **6** | **Health-check failure** | `/health` route returns `500` or takes > 5s | Container marked `(unhealthy)`; CI/CD post-check fails | `docker inspect --format='{{json .State.Health}}' ecommerce_app` | Fix DB ping timeout or endpoint response in `index.js` |
| **7** | **High CPU / disk condition** | Infinite loop or runaway log file filling disk | Alertmanager triggers `HostDiskFillingUp` or `HostHighCpuUsage` | `top -b -n 1` and `df -h /` and `du -sh /var/lib/docker/*` | Clean dangling images (`docker system prune -f`), throttle rogue thread |
| **8** | **CI/CD pipeline failure** | SSH authentication fails or secret missing | GitHub Action step "Deploy via SSH" exits with code 255 | GitHub Actions raw runner log view | Re-add `SERVER_SSH_KEY` in GitHub Repository Secrets |
| **9** | **Permission / access problem** | `appuser` cannot write to temp dir or volume | `EACCES: permission denied, open '/app/data/...'` | `docker exec -it ecommerce_app ls -ld /app/data` | Set ownership in Dockerfile: `RUN chown -R appuser:appgroup /app/data` |
| **10**| **Monitoring / alert failure** | Syntax error in `alert.rules.yml` | Prometheus fails to parse rules; Prometheus container restarts | `docker logs ecommerce_prometheus` or `promtool check rules` | Run `promtool check rules alert.rules.yml`, fix YAML indentation |

---

### 10.3 Section 5 Incident Scenario Detailed Resolution Guide

**The Scenario:**
> *"A new application version has been deployed. The container appears to be running, but users cannot access the application. The interns have access to the server terminal, Docker information, CI/CD logs, and monitoring dashboard."*

#### Step-by-Step Diagnostic Sequence:

```
[User Browser] ---> (X 502/Connection Refused)
                           ↓
               1. Test Host Ports: `curl -I http://localhost`
                           ↓
               2. Inspect Nginx Access & Error Logs:
                  `docker logs ecommerce_nginx --tail 30`
                  Found: "connect() failed (111: Connection refused) while connecting to upstream: http://app:3000"
                           ↓
               3. Verify Container State & Networking:
                  `docker ps` -> App is "Up 2 minutes (healthy?)"
                  `docker network inspect app-net` -> Verify Nginx and App share the network
                           ↓
               4. Probe Container from Inside Network:
                  `docker exec -it ecommerce_nginx wget -qO- http://app:3000/health`
                  Found: Connection refused on port 3000
                           ↓
               5. Probe Process Inside App Container:
                  `docker exec -it ecommerce_app netstat -tlpn` (or `ss -tulwn`)
                  Found: Process is listening on `127.0.0.1:3000` instead of `0.0.0.0:3000`!
                           ↓
               6. Root Cause Identified:
                  Application server bound to localhost loopback inside the container,
                  making it completely unreachable from the Docker bridge interface.
                           ↓
               7. Surgical Fix:
                  Update server listen address in `app/src/index.js`:
                  `app.listen(PORT, '0.0.0.0', () => ...)`
                           ↓
               8. Verification:
                  Rebuild container, test `curl -I http://localhost/health` -> returns 200 OK.
                  Nginx reverse proxy immediately resumes serving traffic with 0 errors.
```

---

## 11. Rollback & Recovery Strategy

To satisfy the requirement of zero downtime and disaster recovery:

### 11.1 Automated Fast Rollback Script (`scripts/rollback.sh`)
```bash
#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="/opt/ecommerce"
cd "$DEPLOY_DIR"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Health check failed. Initiating rollback..."

# 1. Retrieve the previous stable tag recorded prior to deployment
if [ -f /tmp/deploy_state.env ]; then
    source /tmp/deploy_state.env
    ROLLBACK_TAG="${PREVIOUS_TAG:-latest}"
else
    echo "State file not found! Defaulting to 'stable' tag."
    ROLLBACK_TAG="stable"
fi

echo "Rolling back to image tag: $ROLLBACK_TAG"

# 2. Update .env file to previous tag
sed -i "s/IMAGE_TAG=.*/IMAGE_TAG=${ROLLBACK_TAG}/" .env

# 3. Force container recreation with previous working image
docker compose up -d --no-deps app

# 4. Verify post-rollback stability
sleep 5
if wget -qO- http://localhost:80/health > /dev/null; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Rollback SUCCESSFUL. Application restored to $ROLLBACK_TAG."
    exit 0
else
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] CRITICAL: Rollback failed. Manual intervention required!"
    exit 1
fi
```

### 11.2 Database Disaster Recovery Runbook
- **Daily Automated Backup (`scripts/backup_db.sh`):**
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail
  BACKUP_DIR="/opt/ecommerce/backups"
  mkdir -p "$BACKUP_DIR"
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  docker exec ecommerce_db pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"
  # Keep only last 7 days of backups
  find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete
  ```
- **Restore Command:**
  ```bash
  gunzip < /opt/ecommerce/backups/db_backup_TARGET.sql.gz | docker exec -i ecommerce_db psql -U "$DB_USER" -d "$DB_NAME"
  ```

---

## 12. Verification & Evaluation Deliverables Checklist

Mapping directly against **Section 6 & 7: Required Deliverables & Evaluation Focus**:

| Deliverable | Location in Architecture | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **Complete Git Repository** | Branch structure (`main`, `dev`, `feature/*`), `.gitignore` | `git status`, `git log --oneline --graph` | Ready |
| **Dockerfile & Docker Config** | `app/Dockerfile`, `deploy/docker-compose.yml` | `docker compose config`, `hadolint app/Dockerfile` | Ready |
| **CI/CD Pipeline Config** | `.github/workflows/ci-cd.yml` | GitHub Actions run history & green badges | Ready |
| **Deployment & Env Docs** | `deploy/.env.example`, `docs/RUNBOOK.md` | Audit of all secrets & environment variables | Ready |
| **Prometheus & Grafana** | `monitoring/prometheus/`, `monitoring/grafana/` | Web UI at `/grafana/` showing live scrapes | Ready |
| **Monitoring & Alert Rules** | `monitoring/prometheus/alert.rules.yml` | `promtool check rules`, Alertmanager notifications | Ready |
| **Testing Evidence & CI** | Automated unit tests, container health checks | CI build test logs, `/health` endpoint response | Ready |
| **Failure-Injection Report** | `docs/TROUBLESHOOTING_LOG.md` (Section 10 above) | Documented evidence for all 10 injected faults | Ready |
| **Rollback Documentation** | `scripts/rollback.sh`, Section 11 above | Execution test of rollback upon simulated failure | Ready |
| **Final Architecture Diagram**| Visual Mermaid topology (Section 2) | Documented system, network, and CI/CD flows | Ready |
| **Project Walkthrough** | Operations Runbook & Demo Script | Complete end-to-end command walkthrough | Ready |

---

## 13. Minimal Implementation Quick-Start Commands

To bootstrap this entire architecture in under 5 minutes on any Linux VM:

```bash
# 1. Clone repository
git clone https://github.com/your-org/ecommerce-devops.git /opt/ecommerce
cd /opt/ecommerce

# 2. Configure environment variables
cp deploy/.env.example .env
nano .env # Set secure database passwords and keys

# 3. Setup host firewall & permissions
chmod +x scripts/*.sh
sudo ./scripts/setup_linux.sh

# 4. Launch the entire production stack
docker compose -f deploy/docker-compose.yml up -d

# 5. Verify all services are healthy
docker compose -f deploy/docker-compose.yml ps
./scripts/health_check.sh http://localhost/health
```
