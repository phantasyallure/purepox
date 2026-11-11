import { json, group } from '../_lib/util.js'
import { readCalc } from './admin/calc.js'

// Public catalogue + contact settings. Cached at the edge so visitors rarely touch the database.
export async function onRequestGet(ctx) {
  const { request, env } = ctx
  const cache = caches.default
  const key = new Request(new URL('/api/public', request.url).toString())
  const hit = await cache.match(key)
  if (hit) return hit

  try {
    const [p, c, s, calc] = await Promise.all([
      env.DB.prepare('SELECT * FROM products WHERE active = 1 ORDER BY sort_order, created_at').all(),
      env.DB.prepare('SELECT * FROM colors WHERE active = 1 ORDER BY sort_order').all(),
      env.DB.prepare('SELECT * FROM settings WHERE id = 1').first(),
      readCalc(env, true),
    ])
    const res = json(
      { products: group(p.results, c.results), settings: s || {}, calc },
      200,
      { 'cache-control': 'public, max-age=20, s-maxage=30' }
    )
    ctx.waitUntil(cache.put(key, res.clone()))
    return res
  } catch (e) {
    console.error(e)
    return json({ error: 'server_error' }, 500)
  }
}
