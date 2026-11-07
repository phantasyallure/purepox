import { json, bad, clean, purgePublic } from '../../_lib/util.js'

const FIELDS = ['phone', 'phone2', 'email', 'whatsapp', 'facebook', 'instagram', 'address_fr', 'address_ar', 'hours_fr', 'hours_ar']

export async function onRequestGet({ env }) {
  const s = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first()
  return json(s || {})
}

export async function onRequestPut({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('invalid') }
  const vals = FIELDS.map((f) => clean(b[f], 300))
  await env.DB.prepare(`UPDATE settings SET ${FIELDS.map((f) => `${f} = ?`).join(', ')} WHERE id = 1`).bind(...vals).run()
  await purgePublic(request)
  return json({ ok: true })
}
