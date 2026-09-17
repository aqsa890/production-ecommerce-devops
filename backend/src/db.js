const { Pool } = require('pg');

// Initial seed products for in-memory fallback
const FALLBACK_PRODUCTS = [
  {
    id: 1,
    name: 'Pro Noise-Cancelling Headphones',
    category: 'Electronics',
    price: 249.99,
    stock: 45,
    description: 'High-fidelity studio audio with adaptive noise cancellation, Bluetooth 5.3, and 35-hour battery life.',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'
  },
  {
    id: 2,
    name: 'Smart Fitness Watch Series X',
    category: 'Wearables',
    price: 199.99,
    stock: 30,
    description: 'All-day activity tracking, continuous optical heart rate, SpO2 sensor, and 50m water resistance.',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'
  },
  {
    id: 3,
    name: 'Ultra-Slim 4K IPS Monitor 27"',
    category: 'Computers',
    price: 379.00,
    stock: 18,
    description: 'Vibrant 4K UHD display with HDR400, 99% sRGB color gamut, and 65W USB-C power delivery.',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80'
  },
  {
    id: 4,
    name: 'Mechanical RGB Gaming Keyboard',
    category: 'Accessories',
    price: 89.99,
    stock: 60,
    description: 'Hot-swappable linear mechanical switches, aircraft-grade aluminum frame, and customizable per-key RGB.',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80'
  },
  {
    id: 5,
    name: 'Ergonomic Multi-Device Wireless Mouse',
    category: 'Accessories',
    price: 59.99,
    stock: 80,
    description: 'Ergonomic thumb-rest grip, hyper-fast scroll wheel, and seamless multi-device switching across 3 devices.',
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&q=80'
  },
  {
    id: 6,
    name: 'Rapid Dual Wireless Charging Pad 15W',
    category: 'Electronics',
    price: 29.99,
    stock: 120,
    description: 'Qi-certified fast dual charging pad for simultaneous smartphone and wireless earbuds charging.',
    image: 'https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=600&q=80'
  }
];

class DatabaseService {
  constructor() {
    this.isPostgres = false;
    this.pool = null;
    this.inMemoryProducts = [...FALLBACK_PRODUCTS];
    this.inMemoryOrders = [];
    this.lastOrderId = 1000;
  }

  async initialize() {
    const dbHost = process.env.DB_HOST;
    const dbUrl = process.env.DATABASE_URL;

    if (dbHost || dbUrl) {
      try {
        this.pool = new Pool({
          connectionString: dbUrl,
          host: dbHost || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'ecommerce',
          connectionTimeoutMillis: 3000,
        });

        const client = await this.pool.connect();
        console.log('[DB Tier] Connected to PostgreSQL instance successfully.');
        this.isPostgres = true;

        // Ensure tables exist
        await client.query(`
          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            price NUMERIC(10, 2) NOT NULL,
            stock INT NOT NULL DEFAULT 0,
            description TEXT,
            image TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            customer_name VARCHAR(255) NOT NULL,
            customer_email VARCHAR(255) NOT NULL,
            items JSONB NOT NULL,
            total_amount NUMERIC(10, 2) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Check if products need seeding
        const countRes = await client.query('SELECT COUNT(*) FROM products;');
        if (parseInt(countRes.rows[0].count, 10) === 0) {
          console.log('[DB Tier] Seeding initial products table...');
          for (const p of FALLBACK_PRODUCTS) {
            await client.query(
              'INSERT INTO products (name, category, price, stock, description, image) VALUES ($1, $2, $3, $4, $5, $6);',
              [p.name, p.category, p.price, p.stock, p.description, p.image]
            );
          }
        }
        client.release();
      } catch (err) {
        console.warn(`[DB Tier] PostgreSQL not reached (${err.message}). Using in-memory fallback.`);
        this.isPostgres = false;
        this.pool = null;
      }
    } else {
      console.log('[DB Tier] Running in local in-memory fallback mode.');
    }
  }

  async checkHealth() {
    if (!this.isPostgres || !this.pool) {
      return { status: 'healthy', engine: 'in-memory-fallback', connected: true };
    }
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1;');
      client.release();
      return { status: 'healthy', engine: 'postgresql', connected: true };
    } catch (err) {
      return { status: 'degraded', engine: 'postgresql', connected: false, error: err.message };
    }
  }

  async getProducts(category, search) {
    if (this.isPostgres && this.pool) {
      let query = 'SELECT * FROM products WHERE 1=1';
      const params = [];
      if (category) {
        params.push(category);
        query += ` AND LOWER(category) = LOWER($${params.length})`;
      }
      if (search) {
        params.push(`%${search}%`);
        query += ` AND (LOWER(name) LIKE LOWER($${params.length}) OR LOWER(description) LIKE LOWER($${params.length}))`;
      }
      query += ' ORDER BY id ASC;';
      const res = await this.pool.query(query, params);
      return res.rows.map(r => ({ ...r, price: parseFloat(r.price) }));
    }

    let results = [...this.inMemoryProducts];
    if (category) {
      results = results.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return results;
  }

  async getProductById(id) {
    const numId = parseInt(id, 10);
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM products WHERE id = $1;', [numId]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return { ...r, price: parseFloat(r.price) };
    }
    return this.inMemoryProducts.find(p => p.id === numId) || null;
  }

  async createOrder({ customerName, customerEmail, items }) {
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await this.getProductById(item.productId);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found.`);
      }
      const quantity = Math.max(1, parseInt(item.quantity || 1, 10));
      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for '${product.name}'. Available: ${product.stock}, requested: ${quantity}.`);
      }
      totalAmount += product.price * quantity;
      validatedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        subtotal: parseFloat((product.price * quantity).toFixed(2))
      });
    }

    totalAmount = parseFloat(totalAmount.toFixed(2));

    if (this.isPostgres && this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        for (const item of validatedItems) {
          await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2;', [item.quantity, item.productId]);
        }
        const insertRes = await client.query(
          `INSERT INTO orders (customer_name, customer_email, items, total_amount, status)
           VALUES ($1, $2, $3, $4, 'CONFIRMED') RETURNING id, created_at;`,
          [customerName, customerEmail, JSON.stringify(validatedItems), totalAmount]
        );
        await client.query('COMMIT');
        return {
          orderId: insertRes.rows[0].id,
          customerName,
          customerEmail,
          items: validatedItems,
          totalAmount,
          status: 'CONFIRMED',
          createdAt: insertRes.rows[0].created_at
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory fallback execution
    for (const item of validatedItems) {
      const p = this.inMemoryProducts.find(prod => prod.id === item.productId);
      if (p) p.stock -= item.quantity;
    }

    this.lastOrderId += 1;
    const newOrder = {
      orderId: this.lastOrderId,
      customerName,
      customerEmail,
      items: validatedItems,
      totalAmount,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };
    this.inMemoryOrders.push(newOrder);
    return newOrder;
  }

  async getOrders() {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM orders ORDER BY id DESC LIMIT 50;');
      return res.rows;
    }
    return [...this.inMemoryOrders].reverse();
  }
}

module.exports = new DatabaseService();
