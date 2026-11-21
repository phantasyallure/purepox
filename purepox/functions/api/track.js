import { isAuthed } from '../_lib/auth.js'
import { clean } from '../_lib/util.js'

// Anonymous visit counter (no cookies, no IP stored): one row per page view. Read by Admin → Statistiques.
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|facebookexternalhit|curl|wget|python|axios|node-fetch|go-http/i
const empty = () => new Response(null, { status: 204 })

// "l.facebook.com" -> "Facebook", "utm_source=ig" -> "Instagram" ...
export function sourceOf(raw) {
  const r = clean(raw, 80).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  if (!r) return ''
  if (/facebook|^fb$|^fb\.|messenger/.test(r)) return 'Facebook'
  if (/instagram|^ig$/.test(r)) return 'Instagram'
  if (/tiktok/.test(r)) return 'TikTok'
  if (/google/.test(r)) return 'Google'
  if (/whatsapp|^wa\.me$/.test(r)) return 'WhatsApp'
  if (/youtube|youtu\.be/.test(r)) return 'YouTube'
  if (/^t\.co$|twitter|^x\.com$/.test(r)) return 'X'
  return r.replace(/[^a-z0-9._ -]/g, '').slice(0, 40)
}

export async function onRequestPost({ request, env }) {
  const ua = request.headers.get('user-agent') || ''
  if (!ua || BOT.test(ua)) return empty()
  let b
  try { b = await request.json() } catch { return empty() }
  const path = clean(b?.path, 120)
  const vid = clean(b?.vid, 40)
  if (!path.startsWith('/') || path.startsWith('/admin') || !/^[A-Za-z0-9_-]{8,40}$/.test(vid)) return empty()
  // the owner browsing the site while logged in to the admin is not a visitor
  if (await isAuthed(request, env)) return empty()

  const device = /ipad|tablet|android(?!.*mobile)/i.test(ua) ? 'Tablette' : /mobi|android|iphone/i.test(ua) ? 'Mobile' : 'Ordinateur'
  await env.DB.prepare('INSERT INTO visits (vid, path, ref, device) VALUES (?, ?, ?, ?)').bind(vid, path, sourceOf(b?.ref), device).run()
  // keep ~13 months of history
  if (Math.random() < 0.01) await env.DB.prepare(`DELETE FROM visits WHERE ts < strftime('%Y-%m-%dT%H:%M:%fZ','now','-400 days')`).run()
  return empty()
}
