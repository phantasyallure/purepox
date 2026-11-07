import { json, bad, clean, purgePublic } from '../../_lib/util.js'
import { bilingual } from '../../_lib/translate.js'

const PLAIN = ['phone', 'phone2', 'email', 'whatsapp', 'facebook', 'instagram']

export async function onRequestGet({ env }) {
  const s = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first()
  return json(s || {})
}

// address / hours are written once (French or Arabic) and translated automatically
export async function onRequestPut({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('invalid') }
  const prev = (await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first()) || {}

  const pair = async (text, f, a) => {
    if (!text) return { fr: '', ar: '' }
    if (prev[f] && prev[a] && (text === prev[f] || text === prev[a])) return { fr: prev[f], ar: prev[a] }
    return bilingual(env, text)
  }
  const [address, hours] = await Promise.all([
    pair(clean(b.address ?? b.address_fr, 300), 'address_fr', 'address_ar'),
    pair(clean(b.hours ?? b.hours_fr, 300), 'hours_fr', 'hours_ar'),
  ])

  const cols = [...PLAIN, 'address_fr', 'address_ar', 'hours_fr', 'hours_ar']
  const vals = [...PLAIN.map((f) => clean(b[f], 300)), address.fr, address.ar, hours.fr, hours.ar]
  await env.DB.prepare(`UPDATE settings SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = 1`).bind(...vals).run()
  await purgePublic(request)
  return json({ ok: true })
}
