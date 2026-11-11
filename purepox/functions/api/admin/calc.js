import { json, bad, clean, num, purgePublic } from '../../_lib/util.js'
import { bilingual } from '../../_lib/translate.js'
import { SLOTS } from '../../../src/lib/calc.js'

const HEX = /^#[0-9a-fA-F]{6}$/
const MAX_COLORS = 12

// The 4 calculator products (primers + finishes). Missing ones are returned with defaults.
export async function readCalc(env, onlyActive = false) {
  const [p, c] = await Promise.all([
    env.DB.prepare('SELECT * FROM calc_products').all(),
    env.DB.prepare(`SELECT * FROM calc_colors ${onlyActive ? 'WHERE active = 1' : ''} ORDER BY sort_order`).all(),
  ])
  const out = {}
  for (const [slot, d] of Object.entries(SLOTS)) {
    const row = p.results.find((r) => r.slot === slot)
    out[slot] = {
      slot, role: d.role, saved: !!row,
      name_fr: row?.name_fr || d.fr, name_ar: row?.name_ar || d.ar,
      image_url: row?.image_url || '',
      bucket_kg: row?.bucket_kg ?? 20, small_kg: row?.small_kg ?? 10,
      coverage_m2_per_kg: row?.coverage_m2_per_kg ?? d.coverage,
      price: row?.price ?? null, price_small: row?.price_small ?? null, price_wholesale: row?.price_wholesale ?? null,
      colors: c.results.filter((x) => x.slot === slot),
    }
  }
  return out
}

export async function onRequestGet({ env }) {
  return json(await readCalc(env))
}

export async function onRequestPost({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('invalid') }
  const slot = String(b.slot || '')
  const def = SLOTS[slot]
  if (!def) return bad('invalid_slot')

  const bucket = num(b.bucket_kg) ?? 20
  const small = num(b.small_kg) ?? 0
  const cov = num(b.coverage_m2_per_kg) ?? def.coverage
  if (!(bucket > 0) || small < 0 || !(cov > 0)) return bad('invalid_product')

  const price = num(b.price), priceSmall = num(b.price_small), priceWs = num(b.price_wholesale)
  const colors = def.role === 'finition'
    ? (Array.isArray(b.colors) ? b.colors : []).slice(0, MAX_COLORS).map((c, i) => ({
        id: typeof c.id === 'string' && c.id ? c.id : crypto.randomUUID(),
        name_fr: clean(c.name_fr, 80) || clean(c.hex, 9),
        name_ar: clean(c.name_ar, 80) || clean(c.name_fr, 80) || clean(c.hex, 9),
        hex: HEX.test(c.hex) ? c.hex : '#cccccc',
        price: num(c.price), price_small: num(c.price_small), price_wholesale: num(c.price_wholesale), sort_order: i,
      }))
    : []
  if (def.role === 'primer' && !(price > 0)) return bad('invalid_price')
  if (colors.some((c) => !(c.price > 0))) return bad('invalid_color')

  const img = typeof b.image_url === 'string' && (b.image_url.startsWith('/api/img/') || /^https?:\/\//.test(b.image_url)) ? b.image_url : null

  // name: written once (French or Arabic), the other language is automatic
  const prev = await env.DB.prepare('SELECT name_fr, name_ar FROM calc_products WHERE slot = ?').bind(slot).first()
  const nameIn = clean(b.name ?? b.name_fr, 120) || def.fr
  const name = prev && (nameIn === prev.name_fr || nameIn === prev.name_ar) ? { fr: prev.name_fr, ar: prev.name_ar } : await bilingual(env, nameIn)

  const db = env.DB
  const stmts = [
    db.prepare(
      `INSERT INTO calc_products (slot,name_fr,name_ar,image_url,bucket_kg,small_kg,coverage_m2_per_kg,price,price_small,price_wholesale,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(slot) DO UPDATE SET name_fr=excluded.name_fr, name_ar=excluded.name_ar, image_url=excluded.image_url, bucket_kg=excluded.bucket_kg,
         small_kg=excluded.small_kg, coverage_m2_per_kg=excluded.coverage_m2_per_kg, price=excluded.price, price_small=excluded.price_small,
         price_wholesale=excluded.price_wholesale, updated_at=excluded.updated_at`
    ).bind(slot, name.fr, name.ar, img, bucket, small, cov, price, priceSmall, priceWs, new Date().toISOString()),
  ]
  if (colors.length) stmts.push(db.prepare(`DELETE FROM calc_colors WHERE slot = ? AND id NOT IN (${colors.map(() => '?').join(',')})`).bind(slot, ...colors.map((c) => c.id)))
  else stmts.push(db.prepare('DELETE FROM calc_colors WHERE slot = ?').bind(slot))
  for (const c of colors) {
    stmts.push(
      db.prepare(
        `INSERT INTO calc_colors (id,slot,name_fr,name_ar,hex,price,price_small,price_wholesale,active,sort_order) VALUES (?,?,?,?,?,?,?,?,1,?)
         ON CONFLICT(id) DO UPDATE SET name_fr=excluded.name_fr, name_ar=excluded.name_ar, hex=excluded.hex, price=excluded.price,
           price_small=excluded.price_small, price_wholesale=excluded.price_wholesale, sort_order=excluded.sort_order, active=1
         WHERE calc_colors.slot = excluded.slot`
      ).bind(c.id, slot, c.name_fr, c.name_ar, c.hex, c.price, c.price_small, c.price_wholesale, c.sort_order)
    )
  }
  try { await db.batch(stmts) } catch (e) { console.error(e); return bad('server_error', 500) }
  await purgePublic(request)
  return json({ ok: true })
}
