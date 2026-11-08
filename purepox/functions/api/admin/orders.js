import { json } from '../../_lib/util.js'

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT id, customer_name, phone, items, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 300'
  ).all()
  return json(
    results.map((o) => {
      let items = []
      try { items = JSON.parse(o.items) } catch { /* ignore */ }
      return { ...o, items }
    })
  )
}
