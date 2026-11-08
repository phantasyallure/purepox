// Cloudflare Worker entry: serves the API under /api/*.
// Everything else (the React site, /admin, /produit/...) is served from ./dist by the assets binding.
import * as pub from '../functions/api/public.js'
import * as orders from '../functions/api/orders.js'
import * as img from '../functions/api/img/[key].js'
import * as login from '../functions/api/admin/login.js'
import * as logout from '../functions/api/admin/logout.js'
import * as session from '../functions/api/admin/session.js'
import * as aOrders from '../functions/api/admin/orders.js'
import * as aOrder from '../functions/api/admin/orders/[id].js'
import * as aProducts from '../functions/api/admin/products.js'
import * as aProduct from '../functions/api/admin/products/[id].js'
import * as aSettings from '../functions/api/admin/settings.js'
import * as upload from '../functions/api/admin/upload.js'
import { isAuthed } from '../functions/_lib/auth.js'
import { json } from '../functions/_lib/util.js'

// Creates the database tables automatically the first time (safe to run many times)
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name_fr TEXT NOT NULL, name_ar TEXT NOT NULL DEFAULT '', desc_fr TEXT DEFAULT '', desc_ar TEXT DEFAULT '', image_url TEXT, bucket_kg REAL NOT NULL DEFAULT 20, coverage_m2_per_kg REAL NOT NULL DEFAULT 0.5, family TEXT NOT NULL DEFAULT 'epoxy', surface TEXT NOT NULL DEFAULT 'smooth', location TEXT NOT NULL DEFAULT 'interior', thickness TEXT NOT NULL DEFAULT 'lt1', base_price REAL NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
  `CREATE TABLE IF NOT EXISTS colors (id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, name_fr TEXT NOT NULL, name_ar TEXT NOT NULL DEFAULT '', hex TEXT NOT NULL DEFAULT '#cccccc', price REAL, price_wholesale REAL, active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_colors_product ON colors(product_id)`,
  `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, phone TEXT NOT NULL, items TEXT NOT NULL, total REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'new', ip TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_ip ON orders(ip, created_at)`,
  `CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK (id = 1), phone TEXT DEFAULT '', phone2 TEXT DEFAULT '', email TEXT DEFAULT '', whatsapp TEXT DEFAULT '', facebook TEXT DEFAULT '', instagram TEXT DEFAULT '', address_fr TEXT DEFAULT '', address_ar TEXT DEFAULT '', hours_fr TEXT DEFAULT '', hours_ar TEXT DEFAULT '')`,
  `INSERT OR IGNORE INTO settings (id) VALUES (1)`,
]
// Columns added later: ALTER TABLE for databases created before (errors "duplicate column" are ignored)
const MIGRATIONS = [
  `ALTER TABLE products ADD COLUMN family TEXT NOT NULL DEFAULT 'epoxy'`,
  `ALTER TABLE products ADD COLUMN surface TEXT NOT NULL DEFAULT 'smooth'`,
  `ALTER TABLE products ADD COLUMN location TEXT NOT NULL DEFAULT 'interior'`,
  `ALTER TABLE products ADD COLUMN thickness TEXT NOT NULL DEFAULT 'lt1'`,
  `ALTER TABLE colors ADD COLUMN price_wholesale REAL`,
]
let schemaReady = null
function ensureSchema(env) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await env.DB.batch(SCHEMA.map((q) => env.DB.prepare(q)))
      for (const q of MIGRATIONS) {
        try { await env.DB.prepare(q).run() } catch (e) { if (!/duplicate column/i.test(String(e && (e.message || e)))) throw e }
      }
    })().catch((e) => { schemaReady = null; console.error('schema', e) })
  }
  return schemaReady
}

const routes = [
  [/^\/api\/public$/, pub],
  [/^\/api\/orders$/, orders],
  [/^\/api\/img\/([^/]+)$/, img, ['key']],
  [/^\/api\/admin\/login$/, login],
  [/^\/api\/admin\/logout$/, logout],
  [/^\/api\/admin\/session$/, session],
  [/^\/api\/admin\/orders$/, aOrders],
  [/^\/api\/admin\/orders\/([^/]+)$/, aOrder, ['id']],
  [/^\/api\/admin\/products$/, aProducts],
  [/^\/api\/admin\/products\/([^/]+)$/, aProduct, ['id']],
  [/^\/api\/admin\/settings$/, aSettings],
  [/^\/api\/admin\/upload$/, upload],
]

export default {
  async fetch(request, env, execCtx) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) await ensureSchema(env)
    for (const [re, mod, names] of routes) {
      const m = url.pathname.match(re)
      if (!m) continue

      const method = request.method[0] + request.method.slice(1).toLowerCase()
      const handler = mod[`onRequest${method}`]
      if (!handler) return json({ error: 'method_not_allowed' }, 405)

      // every /api/admin/* route except login needs the admin session
      if (url.pathname.startsWith('/api/admin/') && url.pathname !== '/api/admin/login') {
        if (!(await isAuthed(request, env))) return json({ error: 'unauthorized' }, 401)
      }

      const params = {}
      ;(names || []).forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]) })
      try {
        return await handler({ request, env, params, waitUntil: (p) => execCtx.waitUntil(p) })
      } catch (e) {
        console.error(e)
        return json({ error: 'server_error' }, 500)
      }
    }
    return json({ error: 'not_found' }, 404)
  },
}
