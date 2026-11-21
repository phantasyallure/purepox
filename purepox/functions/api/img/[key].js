// Serves product images and PDF catalogs stored in R2
export async function onRequestGet({ request, params, env, waitUntil }) {
  const key = String(params.key || '')
  if (!/^[\w-]+\.(png|jpg|webp|gif|avif|pdf)$/.test(key)) return new Response('Not found', { status: 404 })
  if (!env.IMAGES) return new Response('Not found', { status: 404 })

  const ranged = request.headers.has('range')
  const cache = caches.default
  const ckey = new Request(new URL(request.url).origin + '/api/img/' + key)
  if (!ranged) {
    const hit = await cache.match(ckey)
    if (hit) return hit
  }
  const obj = await env.IMAGES.get(key, ranged ? { range: request.headers } : undefined)
  if (!obj) return new Response('Not found', { status: 404 })

  const headers = new Headers({
    'content-type': obj.httpMetadata?.contentType || 'application/octet-stream',
    'content-disposition': 'inline',
    'cache-control': 'public, max-age=31536000, immutable',
    'accept-ranges': 'bytes',
  })
  if (ranged && obj.range) {
    const offset = obj.range.offset ?? Math.max(0, obj.size - (obj.range.suffix || 0))
    const length = obj.range.length ?? obj.size - offset
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${obj.size}`)
    headers.set('content-length', String(length))
    return new Response(obj.body, { status: 206, headers })
  }
  headers.set('content-length', String(obj.size))
  headers.set('x-content-type-options', 'nosniff')
  const res = new Response(obj.body, { headers })
  // keep a copy at the edge (small files only: product photos), the next visitors get it without touching R2
  if (!ranged && obj.size <= 4 * 1024 * 1024 && waitUntil) waitUntil(cache.put(ckey, res.clone()))
  return res
}
