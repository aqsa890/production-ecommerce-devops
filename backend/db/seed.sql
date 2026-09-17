-- =============================================================================
-- E-Commerce Database Schema & Seed Data
-- Designed for PostgreSQL 14+ / 15+ / 16+
-- =============================================================================

-- Drop tables if exists (clean setup)
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- -----------------------------------------------------------------------------
-- 1. Products Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    description TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on category and name for performant filtering and searching
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- -----------------------------------------------------------------------------
-- 2. Orders Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    items JSONB NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on customer_email and created_at
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Initial Seed Products
-- -----------------------------------------------------------------------------
INSERT INTO products (name, category, price, stock, description, image) VALUES
(
    'Pro Noise-Cancelling Headphones',
    'Electronics',
    249.99,
    45,
    'High-fidelity studio audio with adaptive noise cancellation, Bluetooth 5.3, and 35-hour battery life.',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'
),
(
    'Smart Fitness Watch Series X',
    'Wearables',
    199.99,
    30,
    'All-day activity tracking, continuous optical heart rate, SpO2 sensor, and 50m water resistance.',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'
),
(
    'Ultra-Slim 4K IPS Monitor 27"',
    'Computers',
    379.00,
    18,
    'Vibrant 4K UHD display with HDR400, 99% sRGB color gamut, and 65W USB-C power delivery.',
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80'
),
(
    'Mechanical RGB Gaming Keyboard',
    'Accessories',
    89.99,
    60,
    'Hot-swappable linear mechanical switches, aircraft-grade aluminum frame, and customizable per-key RGB.',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80'
),
(
    'Ergonomic Multi-Device Wireless Mouse',
    'Accessories',
    59.99,
    80,
    'Ergonomic thumb-rest grip, hyper-fast scroll wheel, and seamless multi-device switching across 3 devices.',
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&q=80'
),
(
    'Rapid Dual Wireless Charging Pad 15W',
    'Electronics',
    29.99,
    120,
    'Qi-certified fast dual charging pad for simultaneous smartphone and wireless earbuds charging.',
    'https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=600&q=80'
),
(
    'Thunderbolt 4 Multi-Port Docking Station',
    'Computers',
    179.50,
    25,
    '11-in-1 expansion hub featuring dual 4K HDMI, Gigabit Ethernet, SD card reader, and 100W PD.',
    'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=600&q=80'
),
(
    'Waterproof Outdoor Bluetooth Speaker',
    'Electronics',
    79.99,
    55,
    'IPX7 rugged waterproof housing, 360-degree room-filling sound, and built-in power bank functionality.',
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80'
);

-- -----------------------------------------------------------------------------
-- 4. Initial Seed Order (For verification)
-- -----------------------------------------------------------------------------
INSERT INTO orders (customer_name, customer_email, items, total_amount, status) VALUES
(
    'DevOps Initializer',
    'admin@novastore.local',
    '[{"productId": 1, "name": "Pro Noise-Cancelling Headphones", "price": 249.99, "quantity": 1, "subtotal": 249.99}]',
    249.99,
    'CONFIRMED'
);
