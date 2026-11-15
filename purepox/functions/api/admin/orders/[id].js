import { json, bad } from '../../../_lib/util.js'

const STATUSES = ['new', 'contacted', 'done', 'cancelled']

export async function onRequestPatch({ request, env, params }) {
  let b
  try { b = await request.json() } catch { return bad('invalid') }
  if (!STATUSES.includes(b.status)) return bad('invalid_status')
  await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(b.status, params.id).run()
  return json({ ok: true })
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(params.id).run()
  return json({ ok: true })
}
