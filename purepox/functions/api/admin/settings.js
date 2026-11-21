import { json, bad, clean, purgePublic } from '../../_lib/util.js'
import { bilingual } from '../../_lib/translate.js'

const PLAIN = ['phone', 'phone2', 'email', 'whatsapp', 'facebook', 'instagram', 'catalog_roller', 'catalog_squeegee']
// tracking IDs are injected into <script> tags on the public site: letters, digits, "-" and "_" only
const TRACKING = ['tiktok_pixel', 'meta_pixel', 'ga_id']
const ID_RE = /^[A-Za-z0-9_-]{4,40}$/

export async function onRequestGet({ env }) {
  const s = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first()
  return json(s || {})
}

// Only the fields present in the request are changed, so each admin form (Contact, Marketing) can save on its own.
// address / hours are written once (French or Arabic) and translated automatically
export async function onRequestPut({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('invalid') }
  const prev = (await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first()) || {}
  const has = (k) => Object.prototype.hasOwnProperty.call(b, k)

  const pair = async (text, f, a) => {
    if (!text) return { fr: '', ar: '' }
    if (prev[f] && prev[a] && (text === prev[f] || text === prev[a])) return { fr: prev[f], ar: prev[a] }
    return bilingual(env, text)
  }

  const cols = [], vals = []
  for (const f of PLAIN) if (has(f)) { cols.push(f); vals.push(clean(b[f], 300)) }
  for (const f of TRACKING) {
    if (!has(f)) continue
    const v = clean(b[f], 60)
    if (v && !ID_RE.test(v)) return bad('invalid_' + f)
    cols.push(f); vals.push(v)
  }
  if (has('address') || has('address_fr')) {
    const a = await pair(clean(b.address ?? b.address_fr, 300), 'address_fr', 'address_ar')
    cols.push('address_fr', 'address_ar'); vals.push(a.fr, a.ar)
  }
  if (has('hours') || has('hours_fr')) {
    const h = await pair(clean(b.hours ?? b.hours_fr, 300), 'hours_fr', 'hours_ar')
    cols.push('hours_fr', 'hours_ar'); vals.push(h.fr, h.ar)
  }
  if (cols.length) await env.DB.prepare(`UPDATE settings SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = 1`).bind(...vals).run()
  await purgePublic(request)
  return json({ ok: true })
}
