import { json, bad, clean, num, group, purgePublic } from '../../_lib/util.js'

const HEX = /^#[0-9a-fA-F]{6}$/

export async function onRequestGet({ env }) {
  const [p, c] = await Promise.all([
    env.DB.prepare('SELECT * FROM products ORDER BY sort_order, created_at').all(),
    env.DB.prepare('SELECT * FROM colors ORDER BY sort_order').all(),
  ])
  return json(group(p.results, c.results))
}

// Create or update a product together with its colors (atomic batch)
export async function onRequestPost({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('invalid') }

  const name_fr = clean(b.name_fr, 120)
  const bucket = num(b.bucket_kg)
  const cov = num(b.coverage_m2_per_kg)
  if (!name_fr || !(bucket > 0) || !(cov > 0)) return bad('invalid_product')

  const colors = (Array.isArray(b.colors) ? b.colors : []).slice(0, 60).map((c, i) => ({
    id: typeof c.id === 'string' && c.id ? c.id : crypto.randomUUID(),
    name_fr: clean(c.name_fr, 80),
    name_ar: clean(c.name_ar, 80),
    hex: HEX.test(c.hex) ? c.hex : '#cccccc',
    price: num(c.price),
    sort_order: i,
  }))
  if (colors.some((c) => !c.name_fr || (c.price !== null && c.price < 0))) return bad('invalid_color')

  const prices = colors.map((c) => c.price).filter((x) => x !== null)
  const base = prices.length ? Math.min(...prices) : Math.max(0, num(b.base_price) ?? 0)
  const id = typeof b.id === 'string' && b.id ? b.id : crypto.randomUUID()
  const img = typeof b.image_url === 'string' && (b.image_url.startsWith('/api/img/') || /^https?:\/\//.test(b.image_url)) ? b.image_url : null

  const db = env.DB
  const stmts = [
    db.prepare(
      `INSERT INTO products (id,name_fr,name_ar,desc_fr,desc_ar,image_url,bucket_kg,coverage_m2_per_kg,base_price,sort_order,active,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET name_fr=excluded.name_fr, name_ar=excluded.name_ar, desc_fr=excluded.desc_fr, desc_ar=excluded.desc_ar,
         image_url=excluded.image_url, bucket_kg=excluded.bucket_kg, coverage_m2_per_kg=excluded.coverage_m2_per_kg,
         base_price=excluded.base_price, sort_order=excluded.sort_order, active=excluded.active`
    ).bind(
      id, name_fr, clean(b.name_ar, 120), clean(b.desc_fr, 2000), clean(b.desc_ar, 2000), img,
      bucket, cov, base, Math.round(num(b.sort_order) ?? 0), b.active === false ? 0 : 1, new Date().toISOString()
    ),
  ]

  // remove colors the admin deleted
  if (colors.length) {
    stmts.push(
      db.prepare(`DELETE FROM colors WHERE product_id = ? AND id NOT IN (${colors.map(() => '?').join(',')})`)
        .bind(id, ...colors.map((c) => c.id))
    )
  } else {
    stmts.push(db.prepare('DELETE FROM colors WHERE product_id = ?').bind(id))
  }
  for (const c of colors) {
    stmts.push(
      db.prepare(
        `INSERT INTO colors (id,product_id,name_fr,name_ar,hex,price,active,sort_order) VALUES (?,?,?,?,?,?,1,?)
         ON CONFLICT(id) DO UPDATE SET name_fr=excluded.name_fr, name_ar=excluded.name_ar, hex=excluded.hex,
           price=excluded.price, sort_order=excluded.sort_order, active=1
         WHERE colors.product_id = excluded.product_id`
      ).bind(c.id, id, c.name_fr, c.name_ar, c.hex, c.price, c.sort_order)
    )
  }

  try {
    await db.batch(stmts)
  } catch (e) {
    console.error(e)
    return bad('server_error', 500)
  }
  await purgePublic(request)
  return json({ ok: true, id })
}
