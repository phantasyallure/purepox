// Automatic FR <-> AR translation with Cloudflare Workers AI (binding "AI").
//
// Rules that keep the site from ever showing the wrong language:
//  - every result is CHECKED (Arabic must really be Arabic, French must not be Arabic) and retried once with
//    other language codes if the model returned something unusable;
//  - when the translation still fails, the other language is left EMPTY (never a copy of the source), and the
//    site falls back to the language that exists. `healTranslations` retries those rows later, automatically.
const AR_CH = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g
const LAT_CH = /[A-Za-z\u00C0-\u024F]/g

const count = (s, re) => ((s || '').match(re) || []).length
// share of Arabic letters among all letters (0 = Latin only, 1 = Arabic only)
export const arabicShare = (s) => {
  const a = count(s, AR_CH)
  const l = count(s, LAT_CH)
  return a + l === 0 ? 0 : a / (a + l)
}
export const isArabic = (s) => arabicShare(s) >= 0.4
const looksArabic = (s) => arabicShare(s) >= 0.5
const looksFrench = (s) => count(s, LAT_CH) > 0 && arabicShare(s) < 0.2

// text with nothing to translate (codes like "RAL 7035", "20 kg", "#cccccc", numbers)
function translatable(s) {
  const words = String(s || '')
    .replace(/#[0-9a-f]{3,8}\b/gi, ' ')
    .replace(/\b[A-Z0-9][A-Z0-9\-/.]*\b/g, ' ') // ALL-CAPS codes and acronyms
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|m2|m²|mm|cm|l|ml|da|dzd)?\b/gi, ' ')
  return count(words, LAT_CH) + count(words, AR_CH) >= 2
}

// the model accepts language names; ISO codes are the fallback
const LANGS = { fr: ['french', 'fr'], ar: ['arabic', 'ar'] }

async function run(env, text, from, to) {
  for (let i = 0; i < 2; i++) {
    try {
      const out = await env.AI.run('@cf/meta/m2m100-1.2b', { text, source_lang: LANGS[from][i], target_lang: LANGS[to][i] })
      const t = out && typeof out.translated_text === 'string' ? out.translated_text.trim() : ''
      if (!t || t === text.trim()) continue
      if (to === 'ar' ? !looksArabic(t) : !looksFrench(t)) continue // wrong language / mixed: try the other codes
      return t
    } catch (e) {
      console.error('translate_attempt', LANGS[from][i], e && (e.message || e))
    }
  }
  return null
}

// cut into pieces of at most ~280 characters (the model works best on short sentences), keeping line breaks
function pieces(line) {
  const out = []
  let cur = ''
  const push = (p) => {
    if (cur && (cur + ' ' + p).length > 280) { out.push(cur); cur = p } else cur = cur ? cur + ' ' + p : p
  }
  for (const sentence of line.split(/(?<=[.!?؟])\s+/).filter(Boolean)) {
    if (sentence.length <= 280) { push(sentence); continue }
    for (const part of sentence.split(/(?<=[,;:،؛])\s+/).filter(Boolean)) {
      if (part.length <= 280) { push(part); continue }
      let buf = ''
      for (const w of part.split(/\s+/)) {
        if ((buf + ' ' + w).length > 280 && buf) { push(buf); buf = w } else buf = buf ? buf + ' ' + w : w
      }
      if (buf) push(buf)
    }
  }
  if (cur) out.push(cur)
  return out
}

// translate one text; returns the translated string, or null if it could not be done reliably
export async function translateText(env, text, from, to) {
  text = String(text || '').trim()
  if (!text) return ''
  if (!translatable(text)) return text // codes / numbers: identical in both languages
  if (!env.AI) return null
  const lines = text.split(/\r?\n/)
  const done = await Promise.all(lines.map(async (line) => {
    line = line.trim()
    if (!line) return ''
    if (!translatable(line)) return line
    const parts = await Promise.all(pieces(line).map((p) => (translatable(p) ? run(env, p, from, to) : Promise.resolve(p))))
    return parts.every((x) => x !== null) ? parts.join(' ') : null
  }))
  if (done.some((x) => x === null)) return null
  return done.join('\n').trim() || null
}

// "text" may be French or Arabic. Returns { fr, ar, ok }.
// ok = false: the other language could not be produced. It is left empty (never a copy of the source);
// for Arabic input the French slot keeps the Arabic text only because the column cannot be empty.
export async function bilingual(env, text) {
  text = String(text || '').trim()
  if (!text) return { fr: '', ar: '', ok: true }
  const ar = isArabic(text)
  const other = await translateText(env, text, ar ? 'ar' : 'fr', ar ? 'fr' : 'ar')
  if (other === null) return ar ? { fr: text, ar: text, ok: false } : { fr: text, ar: '', ok: false }
  return ar ? { fr: other, ar: text, ok: true } : { fr: text, ar: other, ok: true }
}

// A stored pair is "complete" when fr is not Arabic and ar is Arabic (or nothing there can be translated).
export function pairState(fr, ar) {
  fr = String(fr || '').trim(); ar = String(ar || '').trim()
  const srcFr = fr && !looksArabic(fr) ? fr : ''
  const srcAr = ar && looksArabic(ar) ? ar : fr && looksArabic(fr) ? fr : ''
  if (!fr && !ar) return { done: true }
  if (!translatable(fr || ar)) return { done: true }
  if (srcFr && srcAr) return { done: true }
  if (srcFr) return { done: false, from: 'fr', text: srcFr }
  if (srcAr) return { done: false, from: 'ar', text: srcAr }
  return { done: true }
}

// ------------------------------------------------------------------------------------------------------
// Self-healing: rows saved while the AI was unavailable (or saved by an older version, with the French text
// copied into the Arabic field) are translated in the background the next time the public catalogue loads.
// ------------------------------------------------------------------------------------------------------
const RETRY_AFTER_MS = 6 * 3600 * 1000
const MAX_PER_RUN = 6

const TARGETS = [
  { table: 'products', key: 'id', fields: [['name_fr', 'name_ar'], ['desc_fr', 'desc_ar']] },
  { table: 'calc_products', key: 'slot', fields: [['name_fr', 'name_ar']] },
]

async function recentlyFailed(env, mk, now) {
  const r = await env.DB.prepare('SELECT v FROM meta WHERE k = ?').bind(mk).first().catch(() => null)
  return Boolean(r && now - Number(r.v) < RETRY_AFTER_MS)
}
const markFailed = (env, mk, now) => env.DB.prepare('INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)').bind(mk, String(now)).run().catch(() => {})

// returns true when something was repaired (the caller then drops the cached catalogue)
export async function healTranslations(env) {
  if (!env.AI) return false
  let changed = false
  let budget = MAX_PER_RUN
  const now = Date.now()

  const fix = async (table, keyCol, keyVal, f, a, st) => {
    const mk = `trf:${table}:${keyVal}:${f}`
    if (await recentlyFailed(env, mk, now)) return
    budget--
    const out = await translateText(env, st.text, st.from, st.from === 'fr' ? 'ar' : 'fr')
    if (!out) { await markFailed(env, mk, now); return }
    const fr = st.from === 'fr' ? st.text : out
    const ar = st.from === 'ar' ? st.text : out
    await env.DB.prepare(`UPDATE ${table} SET ${f} = ?, ${a} = ? WHERE ${keyCol} = ?`).bind(fr, ar, keyVal).run()
    changed = true
  }

  for (const t of TARGETS) {
    let rows
    try { rows = (await env.DB.prepare(`SELECT * FROM ${t.table}`).all()).results } catch { continue }
    for (const row of rows) {
      for (const [f, a] of t.fields) {
        if (budget <= 0) return changed
        const st = pairState(row[f], row[a])
        if (!st.done) await fix(t.table, t.key, row[t.key], f, a, st)
      }
    }
  }
  try {
    const s = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first()
    for (const [f, a] of [['address_fr', 'address_ar'], ['hours_fr', 'hours_ar']]) {
      if (!s || budget <= 0) break
      const st = pairState(s[f], s[a])
      if (!st.done) await fix('settings', 'id', 1, f, a, st)
    }
  } catch { /* ignore */ }
  return changed
}
