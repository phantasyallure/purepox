// Serves product images and PDF catalogs stored in R2
export async function onRequestGet({ request, params, env }) {
  const key = String(params.key || '')
  if (!/^[\w-]+\.(png|jpg|webp|gif|avif|pdf)$/.test(key)) return new Response('Not found', { status: 404 })
  if (!env.IMAGES) return new Response('Not found', { status: 404 })

  const ranged = request.headers.has('range')
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
  return new Response(obj.body, { headers })
}
