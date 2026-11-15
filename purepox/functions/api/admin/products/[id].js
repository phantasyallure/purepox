import { json, purgePublic } from '../../../_lib/util.js'

export async function onRequestDelete({ request, env, params }) {
  await env.DB.prepare('DELETE FROM colors WHERE product_id = ?').bind(params.id).run()
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(params.id).run()
  await purgePublic(request)
  return json({ ok: true })
}
