import { json, bad, clean } from '../_lib/util.js'
import { calculate } from '../../src/lib/calc.js'

// Public: place an order. Prices/kg/total are recomputed here from the database,
// so the client can never send its own prices.
export async function onRequestPost({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('invalid') }

  const name = clean(b.name, 80)
  const phone = clean(b.phone, 25)
  const digits = phone.replace(/\D/g, '')
  if (name.length < 2 || digits.length < 9 || digits.length > 15) return bad('invalid_contact')

  const req = Array.isArray(b.items) ? b.items.slice(0, 20) : []
  if (!req.length) return bad('empty')

  try {
    const ip = request.headers.get('CF-Connecting-IP') || ''
    if (ip) {
      const since = new Date(Date.now() - 10 * 60e3).toISOString()
      const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM orders WHERE ip = ? AND created_at > ?').bind(ip, since).first()
      if (r && r.n >= 5) return bad('rate_limited', 429)
    }

    const ids = [...new Set(req.map((i) => String(i.product_id)))]
    const ph = ids.map(() => '?').join(',')
    const [ps, cs] = await Promise.all([
      env.DB.prepare(`SELECT * FROM products WHERE active = 1 AND id IN (${ph})`).bind(...ids).all(),
      env.DB.prepare(`SELECT * FROM colors WHERE active = 1 AND product_id IN (${ph})`).bind(...ids).all(),
    ])
    const pmap = Object.fromEntries(ps.results.map((p) => [p.id, p]))
    const cmap = Object.fromEntries(cs.results.map((c) => [c.id, c]))

    const items = []
    for (const i of req) {
      const p = pmap[String(i.product_id)]
      const c = cmap[String(i.color_id)]
      const area = Number(i.area)
      if (!p || !c || c.product_id !== p.id || !(area > 0) || area > 100000) return bad('invalid_item')
      const r = calculate(p, c, area)
      if (!r) return bad('invalid_item')
      items.push({
        product_id: p.id, color_id: c.id,
        product_fr: p.name_fr, product_ar: p.name_ar,
        color_fr: c.name_fr, color_ar: c.name_ar, hex: c.hex,
        area_m2: r.area, kg: r.kg, buckets: r.buckets, bucket_kg: r.bucketKg,
        unit_price: r.unitPrice, total: r.total,
      })
    }
    const total = items.reduce((s, i) => s + i.total, 0)

    await env.DB.prepare(
      'INSERT INTO orders (id, customer_name, phone, items, total, status, ip, created_at) VALUES (?,?,?,?,?,?,?,?)'
    ).bind(crypto.randomUUID(), name, phone, JSON.stringify(items), total, 'new', ip, new Date().toISOString()).run()

    return json({ ok: true, total })
  } catch (e) {
    console.error(e)
    return bad('server_error', 500)
  }
}
