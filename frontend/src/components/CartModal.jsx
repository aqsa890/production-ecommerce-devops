import React, { useState } from 'react';

export default function CartModal({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  isCheckingOut,
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  if (!isOpen) return null;

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    onCheckout({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      clearForm: () => {
        setCustomerName('');
        setCustomerEmail('');
      },
    });
  };

  return (
    <div className="modal-overlay" id="cart-modal" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Shopping Cart</h3>
          <button className="close-btn" id="close-cart-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body" id="cart-items-container">
          {cart.length === 0 ? (
            <p className="empty-cart-msg">Your shopping cart is empty.</p>
          ) : (
            cart.map(({ product, quantity }) => {
              const itemTotal = product.price * quantity;
              return (
                <div className="cart-item" key={product.id}>
                  <div>
                    <div className="cart-item-title">{product.name}</div>
                    <div className="cart-item-meta">
                      ${parseFloat(product.price).toFixed(2)} each • Total: ${itemTotal.toFixed(2)}
                    </div>
                  </div>

                  <div className="cart-qty-controls">
                    <button
                      className="qty-btn"
                      onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                    >
                      -
                    </button>
                    <span>{quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                      disabled={quantity >= product.stock}
                    >
                      +
                    </button>
                    <button
                      className="remove-item-btn"
                      onClick={() => onRemoveItem(product.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="modal-footer" id="cart-footer">
            <div className="cart-total-row">
              <span>Order Total:</span>
              <span className="cart-total-amount" id="cart-total-amount">
                ${totalAmount.toFixed(2)}
              </span>
            </div>

            <form id="checkout-form" className="checkout-form" onSubmit={handleSubmit}>
              <h4>Customer Checkout (Tier 2 API Call)</h4>
              <div className="form-group">
                <input
                  type="text"
                  id="cust-name"
                  placeholder="Full Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="email"
                  id="cust-email"
                  placeholder="Email Address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                id="checkout-btn"
                disabled={isCheckingOut}
              >
                {isCheckingOut ? 'Processing Order...' : 'Place Order'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
