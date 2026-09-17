import React from 'react';

const CATEGORIES = [
  { id: '', label: 'All Categories' },
  { id: 'Electronics', label: 'Electronics' },
  { id: 'Wearables', label: 'Wearables' },
  { id: 'Computers', label: 'Computers' },
  { id: 'Accessories', label: 'Accessories' },
];

export default function CategoryFilter({ selectedCategory, onSelectCategory }) {
  return (
    <section className="category-section">
      <div className="container category-chips" id="category-chips">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`chip ${selectedCategory === cat.id ? 'active' : ''}`}
            data-category={cat.id}
            onClick={() => onSelectCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </section>
  );
}
