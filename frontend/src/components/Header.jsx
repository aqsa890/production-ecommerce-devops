import React from 'react';

export default function Header({
  systemHealth,
  cartCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
}) {
  const isBackendUp = systemHealth.backend === 'UP';
  const isDbUp = systemHealth.dbStatus === 'healthy';

  return (
    <>
      {/* 2-Tier Top Telemetry Bar */}
      <header className="top-bar">
        <div className="container top-bar-content">
          <div className="tier-badges">
            <span className="badge-item">
              <span className="dot healthy"></span> <strong>Tier 1:</strong> Frontend (React.js - Port 3000)
            </span>
            <span className="badge-divider">|</span>
            <span className="badge-item">
              <span className={`dot ${isBackendUp ? 'healthy' : 'down'}`} id="backend-dot"></span>{' '}
              <strong>Tier 2:</strong> Backend API (
              <span id="backend-status-text">
                {isBackendUp ? 'Node.js - UP (Port 5001)' : 'DOWN'}
              </span>
              )
            </span>
          </div>

          <div className="top-links">
            <a href="/health" target="_blank" rel="noreferrer" className="badge-link">
              🩺 /health
            </a>
            <a
              href="http://localhost:5001/metrics"
              target="_blank"
              rel="noreferrer"
              className="badge-link"
              id="metrics-link"
            >
              📊 /metrics
            </a>
            <a href="/api/products" target="_blank" rel="noreferrer" className="badge-link">
              📦 /api/products
            </a>
          </div>
        </div>
      </header>

      {/* Main Navbar */}
      <nav className="navbar">
        <div className="container nav-content">
          <div className="logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="logo-icon">⚡</span> Nova<span className="logo-accent">Store</span>
          </div>

          <form className="search-bar" onSubmit={onSearchSubmit}>
            <input
              type="text"
              id="search-input"
              placeholder="Search tech gadgets, monitors, accessories..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <button type="submit" id="search-btn">Search</button>
          </form>

          <div className="nav-actions">
            <button className="cart-btn" id="cart-toggle-btn" onClick={onOpenCart}>
              🛒 Cart <span className="cart-badge" id="cart-count">{cartCount}</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
