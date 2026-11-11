import { json, bad, clean } from '../_lib/util.js'
import { calcMix, primerSlot, TOOL_OF, LAYERS } from '../../src/lib/calc.js'
import { readCalc } from './admin/calc.js'

const pickOf = (v, allowed) => (allowed.includes(v) ? v : null)

// Public: place an order. Quantities, prices and totals are recomputed here from the database,
// so the client can never send its own prices.
export async function onRequestPost({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('invalid') }

  const name = clean(b.name, 80)
  const phone = clean(b.phone, 25)
  const wilaya = clean(b.wilaya, 60)
  const commune = clean(b.commune, 80)
  const digits = phone.replace(/\D/g, '')
  if (name.length < 2 || digits.length < 9 || digits.length > 15 || wilaya.length < 2 || commune.length < 2) return bad('invalid_contact')

  const req = Array.isArray(b.items) ? b.items.slice(0, 20) : []
  if (!req.length) return bad('empty')

  try {
    const ip = request.headers.get('CF-Connecting-IP') || ''
    if (ip) {
      const since = new Date(Date.now() - 10 * 60e3).toISOString()
      const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM orders WHERE ip = ? AND created_at > ?').bind(ip, since).first()
      if (r && r.n >= 5) return bad('rate_limited', 429)
    }

    const items = []
    const calcs = []
    let calcData = null

    for (const i of req) {
      if (i && i.kind === 'calc') {
        // ---------- "Calculer mon besoin": primer + finish ----------
        const family = pickOf(i.family, ['epoxy', 'polyurethane'])
        const support = pickOf(i.support, ['concrete', 'smooth'])
        const location = pickOf(i.location, ['interior', 'exterior'])
        const thickness = pickOf(i.thickness, ['lt1', 'gt1'])
        const area = Number(i.area)
        if (!family || !support || !location || !thickness || !(area > 0) || area > 100000) return bad('invalid_item')
        if (family === 'epoxy' && location !== 'interior') return bad('invalid_item') // epoxy = interior only

        calcData ||= await readCalc(env, true)
        const fin = calcData[family]
        const pri = calcData[primerSlot(support)]
        const color = fin.colors.find((c) => c.id === String(i.color_id))
        const pr = calcMix(pri, pri, area)
        const fr = calcMix(fin, color, area)
        if (!color || !pr || !fr) return bad('invalid_item')

        const group = calcs.length
        calcs.push({ family, support, location, thickness, area, tool: TOOL_OF[thickness], layers: LAYERS })
        items.push({
          kind: 'calc', group, role: 'primer', product_fr: pri.name_fr, product_ar: pri.name_ar, image_url: pri.image_url || '',
          area_m2: pr.area, kg: pr.kg, kg_bought: pr.kgBought, packs: pr.packs, price_tier: pr.tier, total: pr.total,
        })
        items.push({
          kind: 'calc', group, role: 'finition', product_fr: fin.name_fr, product_ar: fin.name_ar, image_url: fin.image_url || '',
          color_fr: color.name_fr, color_ar: color.name_ar, hex: color.hex,
          area_m2: fr.area, kg: fr.kg, kg_bought: fr.kgBought, packs: fr.packs, price_tier: fr.tier, total: fr.total,
        })
      } else {
        // ---------- normal product: colour + number of buckets ----------
        const qty = Math.floor(Number(i?.qty))
        if (!(qty >= 1) || qty > 500) return bad('invalid_item')
        const p = await env.DB.prepare('SELECT * FROM products WHERE active = 1 AND id = ?').bind(String(i?.product_id)).first()
        const c = p && (await env.DB.prepare('SELECT * FROM colors WHERE active = 1 AND id = ? AND product_id = ?').bind(String(i?.color_id), p.id).first())
        const unit = c && (Number(c.price) || Number(p.base_price) || 0)
        if (!p || !c || !(unit > 0)) return bad('invalid_item')
        items.push({
          kind: 'catalog', product_id: p.id, product_fr: p.name_fr, product_ar: p.name_ar, image_url: p.image_url || '',
          color_fr: c.name_fr, color_ar: c.name_ar, hex: c.hex, packs: [{ n: qty, price: unit }], total: qty * unit,
        })
      }
    }
    const total = items.reduce((s, i) => s + i.total, 0)
    const id = crypto.randomUUID()
    const meta = { calcs }

    await env.DB.prepare(
      'INSERT INTO orders (id, customer_name, phone, wilaya, commune, items, meta, total, status, ip, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(id, name, phone, wilaya, commune, JSON.stringify(items), JSON.stringify(meta), total, 'new', ip, new Date().toISOString()).run()

    return json({ ok: true, total, ref: id.slice(0, 6).toUpperCase(), items, meta })
  } catch (e) {
    console.error(e)
    return bad('server_error', 500)
  }
}
