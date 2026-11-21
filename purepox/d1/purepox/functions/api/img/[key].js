// Serves product images stored in R2
export async function onRequestGet({ params, env }) {
  const key = String(params.key || '')
  if (!/^[\w-]+\.(png|jpg|webp|gif|avif)$/.test(key)) return new Response('Not found', { status: 404 })
  if (!env.IMAGES) return new Response('Not found', { status: 404 })
  const obj = await env.IMAGES.get(key)
  if (!obj) return new Response('Not found', { status: 404 })
  return new Response(obj.body, {
    headers: {
      'content-type': obj.httpMetadata?.contentType || 'image/jpeg',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
