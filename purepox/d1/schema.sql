-- Purepox — Cloudflare D1 schema (run once in the D1 console)

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name_fr TEXT NOT NULL,
  name_ar TEXT NOT NULL DEFAULT '',
  desc_fr TEXT DEFAULT '',
  desc_ar TEXT DEFAULT '',
  image_url TEXT,
  bucket_kg REAL NOT NULL DEFAULT 20,            -- kg per bucket
  coverage_m2_per_kg REAL NOT NULL DEFAULT 0.5,  -- m² covered by 1 kg
  family TEXT NOT NULL DEFAULT 'epoxy',          -- 'epoxy' | 'polyurethane'
  surface TEXT NOT NULL DEFAULT 'smooth',        -- 'concrete' | 'smooth' | 'both'
  location TEXT NOT NULL DEFAULT 'interior',     -- 'interior' | 'exterior' | 'both'
  thickness TEXT NOT NULL DEFAULT 'lt1',         -- 'lt1' (< 1 mm) | 'gt1' (> 1 mm)
  base_price REAL NOT NULL DEFAULT 0,            -- lowest color price (auto)
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS colors (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name_fr TEXT NOT NULL,
  name_ar TEXT NOT NULL DEFAULT '',
  hex TEXT NOT NULL DEFAULT '#cccccc',
  price REAL,                                    -- retail price per bucket (prix de détail)
  price_wholesale REAL,                          -- wholesale price per bucket (prix de gros), used from 200 m²
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_colors_product ON colors(product_id);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  items TEXT NOT NULL,                           -- JSON
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_ip ON orders(ip, created_at);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  phone TEXT DEFAULT '',
  phone2 TEXT DEFAULT '',
  email TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  facebook TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  address_fr TEXT DEFAULT '',
  address_ar TEXT DEFAULT '',
  hours_fr TEXT DEFAULT '',
  hours_ar TEXT DEFAULT ''
);
INSERT OR IGNORE INTO settings (id) VALUES (1);
