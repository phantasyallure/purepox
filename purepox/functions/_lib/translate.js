// Automatic FR <-> AR translation with Cloudflare Workers AI (binding "AI").
// If the AI is unavailable, the original text is used for both languages (the site never breaks).
const ARABIC = /[\u0600-\u06FF]/
export const isArabic = (s) => ARABIC.test(s || '')

async function run(env, text, from, to) {
  const out = await env.AI.run('@cf/meta/m2m100-1.2b', { text, source_lang: from, target_lang: to })
  const t = out && out.translated_text
  return typeof t === 'string' && t.trim() ? t.trim() : null
}

// cut long text into small pieces (the model works best on short sentences)
function chunks(text) {
  const parts = text.split(/(?<=[.!?؟\n])\s+/).filter(Boolean)
  const out = []
  let cur = ''
  for (const p of parts) {
    if ((cur + ' ' + p).length > 300 && cur) { out.push(cur); cur = p } else cur = cur ? cur + ' ' + p : p
  }
  if (cur) out.push(cur)
  return out
}

// "text" may be French or Arabic. Returns { fr, ar }.
export async function bilingual(env, text) {
  text = String(text || '').trim()
  if (!text) return { fr: '', ar: '' }
  const ar = isArabic(text)
  let other = null
  if (env.AI) {
    try {
      const from = ar ? 'arabic' : 'french'
      const to = ar ? 'french' : 'arabic'
      const done = await Promise.all(chunks(text).map((c) => run(env, c, from, to)))
      if (done.every(Boolean)) other = done.join(' ')
    } catch (e) { console.error('translate_failed', e) }
  }
  other = other || text
  return ar ? { fr: other, ar: text } : { fr: text, ar: other }
}
