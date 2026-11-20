import { json } from '../../_lib/util.js'

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT id, customer_name, phone, wilaya, commune, items, meta, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 300'
  ).all()
  const parse = (s, d) => { try { return JSON.parse(s) ?? d } catch { return d } }
  return json(results.map((o) => ({ ...o, ref: o.id.slice(0, 6).toUpperCase(), items: parse(o.items, []), meta: parse(o.meta, {}) })))
}
