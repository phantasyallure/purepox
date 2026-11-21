import { json, bad, purgePublic } from '../../../_lib/util.js'

export async function onRequestDelete({ request, env, params }) {
  await env.DB.prepare('DELETE FROM colors WHERE product_id = ?').bind(params.id).run()
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(params.id).run()
  await purgePublic(request)
  return json({ ok: true })
}

// quick show / hide from the admin card: { active }
export async function onRequestPatch({ request, env, params }) {
  let b
  try { b = await request.json() } catch { return bad('invalid') }
  const active = b.active === false || b.active === 0 ? 0 : 1
  await env.DB.prepare('UPDATE products SET active = ? WHERE id = ?').bind(active, params.id).run()
  await purgePublic(request)
  return json({ ok: true, active: !!active })
}
