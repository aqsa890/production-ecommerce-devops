import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CategoryFilter from './components/CategoryFilter';
import ProductCard from './components/ProductCard';
import CartModal from './components/CartModal';
import Toast from './components/Toast';

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [systemHealth, setSystemHealth] = useState({
    frontend: 'UP',
    backend: 'CHECKING',
    dbStatus: 'unknown',
    dbEngine: '',
  });

  // Trigger temporary toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Poll 3-Tier System Health
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/health');
      const data = await res.json();
      const isBackendUp = Boolean(
        (data.backend && data.backend.connected) ||
        (data.status === 'UP' && (data.tier === 'backend-api' || data.database))
      );
      const dbInfo = data.backend ? data.backend.details?.database : data.database;

      if (isBackendUp) {
        setSystemHealth({
          frontend: 'UP',
          backend: 'UP',
          dbStatus: dbInfo?.connected ? 'healthy' : 'degraded',
          dbEngine: dbInfo?.engine || 'connected',
        });
      } else {
        setSystemHealth({
          frontend: 'UP',
          backend: 'DOWN',
          dbStatus: 'down',
          dbEngine: 'unreachable',
        });
      }
    } catch (_) {
      setSystemHealth({
        frontend: 'UP',
        backend: 'DOWN',
        dbStatus: 'down',
        dbEngine: 'offline',
      });
    }
  }, []);

  // Fetch Products from Backend API
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    let url = '/api/products?';
    if (selectedCategory) url += `category=${encodeURIComponent(selectedCategory)}&`;
    if (submittedSearch) url += `search=${encodeURIComponent(submittedSearch)}&`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts(data.data);
      } else {
        setError(data.error || 'Failed to retrieve products from backend.');
      }
    } catch (err) {
      setError('Cannot connect to Backend API service (Port 5001). Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, submittedSearch]);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Cart operations
  const handleAddToCart = (product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast(`Cannot add more. Only ${product.stock} available.`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
    showToast(`Added '${product.name}' to cart!`);
  };

  const handleUpdateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveItem = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSubmittedSearch(searchQuery.trim());
  };

  const handleCheckout = async ({ customerName, customerEmail, clearForm }) => {
    setIsCheckingOut(true);
    const orderPayload = {
      customerName,
      customerEmail,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(`🎉 Order #${data.data.orderId} placed successfully!`);
        setCart([]);
        setIsCartOpen(false);
        clearForm();
        fetchProducts(); // Refresh stock counts
      } else {
        showToast(`Checkout Error: ${data.error || 'Failed to place order.'}`);
      }
    } catch (_) {
      showToast('Network error while placing order. Please retry.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <Header
        systemHealth={systemHealth}
        cartCount={totalCartItems}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
      />

      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <main className="container main-content">
        <div className="section-header">
          <div>
            <h2 id="catalog-title">
              {selectedCategory ? `${selectedCategory} Catalog` : 'Product Catalog'}
            </h2>
            <p className="catalog-subtitle">2-Tier React Frontend + Express Node.js API</p>
          </div>
          <span className="product-count" id="product-count-label">
            {loading ? 'Fetching products...' : `Showing ${products.length} product${products.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {loading ? (
          <div className="loading-box">
            <div className="spinner"></div>
            <p>Loading live catalog from Backend API...</p>
          </div>
        ) : error ? (
          <div className="empty-cart-msg">
            <p>⚠️ {error}</p>
            <button className="btn btn-primary" onClick={fetchProducts} style={{ marginTop: '1rem' }}>
              Retry Fetching
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-cart-msg">
            <p>No products found matching your filter or search query.</p>
          </div>
        ) : (
          <div className="products-grid" id="products-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </main>

      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
      />

      <Toast message={toastMessage} />

      <footer className="footer">
        <div className="container footer-content">
          <p>&copy; 2026 NovaStore E-Commerce • Production React + Node.js 2-Tier Stack</p>
          <p className="footer-sub">
            Tier 1: React / Vite (Port 3000) • Tier 2: Node.js Express API & Prometheus (Port 5001)
          </p>
        </div>
      </footer>
    </>
  );
}
