let cart = [];
let allProducts = [];
let activeCategory = '';

// DOM Elements
const productsGrid = document.getElementById('products-grid');
const productCountLabel = document.getElementById('product-count-label');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const categoryChips = document.getElementById('category-chips');
const cartToggleBtn = document.getElementById('cart-toggle-btn');
const cartModal = document.getElementById('cart-modal');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalAmount = document.getElementById('cart-total-amount');
const cartCount = document.getElementById('cart-count');
const checkoutForm = document.getElementById('checkout-form');
const toast = document.getElementById('toast');

// 3-Tier Status Indicators
const backendDot = document.getElementById('backend-dot');
const backendStatusText = document.getElementById('backend-status-text');
const dbDot = document.getElementById('db-dot');
const dbStatusText = document.getElementById('db-status-text');

document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  checkThreeTierHealth();
  setInterval(checkThreeTierHealth, 10000);

  setupEventListeners();
});

function setupEventListeners() {
  categoryChips.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.dataset.category || '';
      fetchProducts();
    }
  });

  searchBtn.addEventListener('click', () => fetchProducts());
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') fetchProducts();
  });

  cartToggleBtn.addEventListener('click', () => openCart());
  closeCartBtn.addEventListener('click', () => closeCart());
  cartModal.addEventListener('click', (e) => {
    if (e.target === cartModal) closeCart();
  });

  checkoutForm.addEventListener('submit', handleCheckout);
}

// 1. Check 3-Tier System Health
async function checkThreeTierHealth() {
  try {
    const res = await fetch('/health');
    const data = await res.json();

    if (data.backend && data.backend.connected) {
      backendDot.className = 'dot healthy';
      backendStatusText.textContent = 'UP (Port 5000)';

      const dbInfo = data.backend.details ? data.backend.details.database : null;
      if (dbInfo && dbInfo.connected) {
        dbDot.className = 'dot healthy';
        dbStatusText.textContent = dbInfo.engine.toUpperCase();
      } else {
        dbDot.className = 'dot degraded';
        dbStatusText.textContent = 'Degraded';
      }
    } else {
      backendDot.className = 'dot down';
      backendStatusText.textContent = 'DOWN';
      dbDot.className = 'dot down';
      dbStatusText.textContent = 'Unreachable';
    }
  } catch (err) {
    backendDot.className = 'dot down';
    backendStatusText.textContent = 'OFFLINE';
    dbDot.className = 'dot down';
    dbStatusText.textContent = 'OFFLINE';
  }
}

// 2. Fetch Products via Tier 2 Backend
async function fetchProducts() {
  const query = searchInput.value.trim();
  let url = '/api/products?';
  if (activeCategory) url += `category=${encodeURIComponent(activeCategory)}&`;
  if (query) url += `search=${encodeURIComponent(query)}&`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      allProducts = data.data;
      renderProducts(allProducts);
    } else {
      productsGrid.innerHTML = `<p class="empty-cart-msg">Error loading catalog: ${data.error}</p>`;
    }
  } catch (err) {
    productsGrid.innerHTML = `
      <div class="empty-cart-msg">
        <p>⚠️ Cannot reach Backend API service.</p>
        <small>Make sure the backend is running on port 5000.</small>
      </div>
    `;
  }
}

function renderProducts(products) {
  productCountLabel.textContent = `Showing ${products.length} product${products.length === 1 ? '' : 's'}`;

  if (products.length === 0) {
    productsGrid.innerHTML = `<p class="empty-cart-msg">No products found matching your search.</p>`;
    return;
  }

  productsGrid.innerHTML = products.map(p => `
    <div class="product-card">
      <img src="${p.image}" alt="${p.name}" class="product-img" loading="lazy">
      <div class="product-body">
        <span class="product-category">${p.category}</span>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <div class="product-footer">
          <div>
            <div class="product-price">$${parseFloat(p.price).toFixed(2)}</div>
            <span class="stock-badge">${p.stock} in stock</span>
          </div>
          <button class="btn btn-primary" onclick="addToCart(${p.id})">Add to Cart</button>
        </div>
      </div>
    </div>
  `).join('');
}

function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.productId === productId);
  if (existing) {
    if (existing.quantity >= product.stock) {
      showToast(`Cannot add more. Only ${product.stock} in stock.`);
      return;
    }
    existing.quantity += 1;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: parseFloat(product.price),
      quantity: 1,
      stock: product.stock
    });
  }

  updateCartUI();
  showToast(`Added '${product.name}' to cart!`);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.productId !== productId);
  updateCartUI();
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalCount;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `<p class="empty-cart-msg">Your cart is empty.</p>`;
    cartTotalAmount.textContent = '$0.00';
    return;
  }

  let total = 0;
  cartItemsContainer.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    return `
      <div class="cart-item">
        <div>
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-meta">${item.quantity} × $${item.price.toFixed(2)} = $${itemTotal.toFixed(2)}</div>
        </div>
        <button class="remove-item-btn" onclick="removeFromCart(${item.productId})">Remove</button>
      </div>
    `;
  }).join('');

  cartTotalAmount.textContent = `$${total.toFixed(2)}`;
}

function openCart() {
  updateCartUI();
  cartModal.classList.add('open');
}

function closeCart() {
  cartModal.classList.remove('open');
}

async function handleCheckout(e) {
  e.preventDefault();

  if (cart.length === 0) {
    showToast('Your cart is empty.');
    return;
  }

  const name = document.getElementById('cust-name').value.trim();
  const email = document.getElementById('cust-email').value.trim();

  const orderPayload = {
    customerName: name,
    customerEmail: email,
    items: cart.map(item => ({ productId: item.productId, quantity: item.quantity }))
  };

  try {
    const btn = document.getElementById('checkout-btn');
    btn.disabled = true;
    btn.textContent = 'Processing Order...';

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const data = await res.json();
    btn.disabled = false;
    btn.textContent = 'Place Order';

    if (res.ok && data.success) {
      showToast(`🎉 Order #${data.data.orderId} placed successfully!`);
      cart = [];
      updateCartUI();
      closeCart();
      checkoutForm.reset();
      fetchProducts();
    } else {
      showToast(`Error: ${data.error || 'Failed to place order'}`);
    }
  } catch (err) {
    console.error('Checkout error:', err);
    showToast('Network error while placing order.');
  }
}

function showToast(msg) {
  toast.textContent = msg;
  toast.className = 'toast show';
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}
