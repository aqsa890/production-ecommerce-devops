import React from 'react';

export default function ProductCard({ product, onAddToCart }) {
  return (
    <div className="product-card">
      <img
        src={product.image}
        alt={product.name}
        className="product-img"
        loading="lazy"
        onError={(e) => {
          e.target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
        }}
      />
      <div className="product-body">
        <span className="product-category">{product.category}</span>
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        <div className="product-footer">
          <div>
            <div className="product-price">${parseFloat(product.price).toFixed(2)}</div>
            <span className="stock-badge">{product.stock} in stock</span>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => onAddToCart(product)}
            disabled={product.stock <= 0}
          >
            {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
