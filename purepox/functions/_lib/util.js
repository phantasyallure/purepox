export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })

export const bad = (error, status = 400) => json({ error }, status)
export const clean = (v, max) => String(v ?? '').trim().slice(0, max)
export const num = (v) => {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Drop the cached public catalogue (this data centre) so admin edits show up quickly
export async function purgePublic(request) {
  try {
    await caches.default.delete(new Request(new URL('/api/public', request.url).toString()))
  } catch { /* ignore */ }
}

export function group(products, colors) {
  const by = {}
  for (const c of colors) (by[c.product_id] ||= []).push({ ...c, active: !!c.active })
  return products.map((p) => ({ ...p, active: !!p.active, colors: by[p.id] || [] }))
}
