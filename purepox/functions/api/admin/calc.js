import { json, bad, clean, num, purgePublic } from '../../_lib/util.js'
import { bilingual, pairState } from '../../_lib/translate.js'

const HEX = /^#[0-9a-fA-F]{6}$/
const MAX_COLORS = 24
const pick = (v, allowed, dflt) => (allowed.includes(v) ? v : dflt)

// Every calculator product (primers + finishes) with its rules and colours.
// onlyActive = what the public site gets (active products and colours only).
export async function readCalc(env, onlyActive = false) {
  const [p, c] = await Promise.all([
    env.DB.prepare(`SELECT * FROM calc_products ${onlyActive ? 'WHERE active = 1' : ''} ORDER BY sort_order, rowid`).all(),
    env.DB.prepare(`SELECT * FROM calc_colors ${onlyActive ? 'WHERE active = 1' : ''} ORDER BY sort_order`).all(),
  ])
  const out = {}
  for (const row of p.results) {
    // A row without a role used to be skipped here, which made products vanish from the admin (and the site).
    // It now stays visible: the role is guessed from the slot name, and `needsRepair` flags it in the admin.
    const role = row.role || (/^primer/i.test(row.slot) ? 'primer' : 'finition')
    const from = role === 'finition' && row.colors_from && row.colors_from !== row.slot ? row.colors_from : null
    out[row.slot] = {
      slot: row.slot, role, needsRepair: !row.role, active: !!row.active, sort_order: row.sort_order || 0,
      family: row.family || 'both', support: row.support || 'both', location: row.location || 'both', thickness: row.thickness || 'both',
      name_fr: row.name_fr, name_ar: row.name_ar || row.name_fr,
      image_url: row.image_url || '',
      bucket_kg: row.bucket_kg ?? 20, small_kg: row.small_kg ?? 10,
      coverage_m2_per_kg: row.coverage_m2_per_kg ?? 1,
      price: row.price ?? null, price_small: row.price_small ?? null, price_wholesale: row.price_wholesale ?? null,
      colorsFrom: from, // shares the colours (and prices) of another finish
      colors: c.results.filter((x) => x.slot === (from || row.slot)),
    }
  }
  return out
}

export async function onRequestGet({ env }) {
  return json(await readCalc(env))
}

// create (no slot) or update (slot) a product
export async function onRequestPost({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('invalid') }

  const existing = b.slot ? await env.DB.prepare('SELECT * FROM calc_products WHERE slot = ?').bind(String(b.slot)).first() : null
  if (b.slot && !existing) return bad('invalid_slot')
  const slot = existing ? existing.slot : `p_${crypto.randomUUID().slice(0, 8)}`
  const role = existing?.role || pick(b.role, ['primer', 'finition'], null)
  if (!role) return bad('invalid_role')

  const bucket = num(b.bucket_kg) ?? 20
  const small = num(b.small_kg) ?? 0
  const cov = num(b.coverage_m2_per_kg)
  if (!(bucket > 0) || small < 0 || !(cov > 0)) return bad('invalid_product')

  const family = pick(b.family, ['epoxy', 'polyurethane', 'both'], 'both')
  const support = role === 'primer' ? pick(b.support, ['concrete', 'smooth', 'both'], 'both') : null
  const location = role === 'finition' ? pick(b.location, ['interior', 'exterior', 'both'], 'both') : null
  const thickness = role === 'finition' ? pick(b.thickness, ['lt1', 'gt1', 'both'], 'both') : null
  const active = b.active === false || b.active === 0 ? 0 : 1

  // colours can be shared with another finish (it must exist, be a finish and not share itself)
  let from = null
  if (role === 'finition' && b.colors_from && b.colors_from !== slot) {
    const src = await env.DB.prepare('SELECT slot, role, colors_from FROM calc_products WHERE slot = ?').bind(String(b.colors_from)).first()
    if (!src || src.role !== 'finition' || src.colors_from) return bad('invalid_colors_from')
    from = src.slot
  }

  const price = num(b.price), priceSmall = num(b.price_small), priceWs = num(b.price_wholesale)
  const colors = role === 'finition' && !from
    ? (Array.isArray(b.colors) ? b.colors : []).slice(0, MAX_COLORS).map((c, i) => ({
        id: typeof c.id === 'string' && c.id ? c.id : crypto.randomUUID(),
        name_fr: clean(c.name_fr, 80) || clean(c.hex, 9),
        name_ar: clean(c.name_ar, 80) || clean(c.name_fr, 80) || clean(c.hex, 9),
        hex: HEX.test(c.hex) ? c.hex : '#cccccc',
        price: num(c.price), price_small: num(c.price_small), price_wholesale: num(c.price_wholesale), sort_order: i,
      }))
    : []
  if (role === 'primer' && !(price > 0)) return bad('invalid_price')
  if (role === 'finition' && !from && !colors.length) return bad('invalid_color')
  if (colors.some((c) => !(c.price > 0) && !(price > 0))) return bad('invalid_color')

  const img = typeof b.image_url === 'string' && (b.image_url.startsWith('/api/img/') || /^https?:\/\//.test(b.image_url)) ? b.image_url : null

  // name: written once (French or Arabic), the other language is automatic
  const nameIn = clean(b.name ?? b.name_fr, 120)
  if (!nameIn) return bad('invalid_name')
  const name = existing && (nameIn === existing.name_fr || nameIn === existing.name_ar) && pairState(existing.name_fr, existing.name_ar).done ? { fr: existing.name_fr, ar: existing.name_ar } : await bilingual(env, nameIn)

  const maxSort = existing ? existing.sort_order : ((await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM calc_products WHERE role = ? AND sort_order < 90').bind(role).first())?.m || 0) + 1
  const sort = num(b.sort_order) ?? maxSort

  const db = env.DB
  const stmts = [
    db.prepare(
      `INSERT INTO calc_products (slot,name_fr,name_ar,image_url,bucket_kg,small_kg,coverage_m2_per_kg,price,price_small,price_wholesale,role,family,support,location,thickness,colors_from,sort_order,active,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(slot) DO UPDATE SET name_fr=excluded.name_fr, name_ar=excluded.name_ar, image_url=excluded.image_url, bucket_kg=excluded.bucket_kg,
         small_kg=excluded.small_kg, coverage_m2_per_kg=excluded.coverage_m2_per_kg, price=excluded.price, price_small=excluded.price_small,
         price_wholesale=excluded.price_wholesale, family=excluded.family, support=excluded.support, location=excluded.location, thickness=excluded.thickness,
         colors_from=excluded.colors_from, sort_order=excluded.sort_order, active=excluded.active, updated_at=excluded.updated_at`
    ).bind(slot, name.fr, name.ar, img, bucket, small, cov, price, priceSmall, priceWs, role, family, support, location, thickness, from, sort, active, new Date().toISOString()),
  ]
  if (role === 'finition' && !from) {
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
  }
  try { await db.batch(stmts) } catch (e) { console.error(e); return bad('server_error', 500) }
  await purgePublic(request)
  return json({ ok: true, slot })
}

// delete a product (and its colours). Finishes that shared its colours get a copy first.
export async function onRequestDelete({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('invalid') }
  const slot = String(b.slot || '')
  const row = await env.DB.prepare('SELECT slot, role FROM calc_products WHERE slot = ?').bind(slot).first()
  if (!row) return bad('invalid_slot')
  const db = env.DB
  const stmts = []
  const linked = await db.prepare('SELECT slot FROM calc_products WHERE colors_from = ?').bind(slot).all()
  for (const l of linked.results) {
    stmts.push(db.prepare(
      `INSERT INTO calc_colors (id,slot,name_fr,name_ar,hex,price,price_small,price_wholesale,active,sort_order)
       SELECT lower(hex(randomblob(16))), ?, name_fr, name_ar, hex, price, price_small, price_wholesale, active, sort_order FROM calc_colors WHERE slot = ?`
    ).bind(l.slot, slot))
    stmts.push(db.prepare('UPDATE calc_products SET colors_from = NULL WHERE slot = ?').bind(l.slot))
  }
  stmts.push(db.prepare('DELETE FROM calc_colors WHERE slot = ?').bind(slot))
  stmts.push(db.prepare('DELETE FROM calc_products WHERE slot = ?').bind(slot))
  try { await db.batch(stmts) } catch (e) { console.error(e); return bad('server_error', 500) }
  await purgePublic(request)
  return json({ ok: true })
}

// quick show / hide from the admin card: { slot, active }
export async function onRequestPatch({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('invalid') }
  const slot = String(b.slot || '')
  const active = b.active === false || b.active === 0 ? 0 : 1
  const row = await env.DB.prepare('SELECT slot FROM calc_products WHERE slot = ?').bind(slot).first()
  if (!row) return bad('invalid_slot')
  try { await env.DB.prepare('UPDATE calc_products SET active = ?, updated_at = ? WHERE slot = ?').bind(active, new Date().toISOString(), slot).run() } catch (e) { console.error(e); return bad('server_error', 500) }
  await purgePublic(request)
  return json({ ok: true, slot, active: !!active })
}
