// Marketing pixels (TikTok, Facebook) + the site's own visitor counter.
// Pixel IDs come from Admin → Marketing (settings: tiktok_pixel, meta_pixel).
// Nothing is loaded for an empty ID. IDs are re-validated here because they end up in script URLs.
const ID_RE = /^[A-Za-z0-9_-]{4,40}$/
const ok = (v) => typeof v === 'string' && ID_RE.test(v.trim())
const started = {}

function script(src) {
  const s = document.createElement('script')
  s.async = true; s.src = src
  document.head.appendChild(s)
}

function startMeta(id) {
  if (window.fbq) return
  const n = (window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) })
  if (!window._fbq) window._fbq = n
  n.push = n; n.loaded = true; n.version = '2.0'; n.queue = []
  script('https://connect.facebook.net/en_US/fbevents.js')
  window.fbq('init', id)
}

function startTikTok(id) {
  const t = 'ttq'
  const q = (window.TiktokAnalyticsObject = t, window[t] = window[t] || [])
  q.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent']
  q.setAndDefer = (o, m) => { o[m] = (...a) => o.push([m, ...a]) }
  q.methods.forEach((m) => q.setAndDefer(q, m))
  q.instance = (i) => { const e = (q._i && q._i[i]) || []; q.methods.forEach((m) => q.setAndDefer(e, m)); return e }
  q._i = q._i || {}; q._i[id] = []; q._i[id]._u = 'https://analytics.tiktok.com/i18n/pixel/events.js'
  q._t = q._t || {}; q._t[id] = +new Date(); q._o = q._o || {}; q._o[id] = {}
  script(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${id}&lib=${t}`)
}

export function initTracking(s) {
  if (!s || typeof document === 'undefined') return
  const meta = (s.meta_pixel || '').trim(), tt = (s.tiktok_pixel || '').trim()
  if (ok(meta) && !started.meta) { started.meta = meta; startMeta(meta) }
  if (ok(tt) && !started.tt) { started.tt = tt; startTikTok(tt) }
}

// one call per page view (also on every route change of the single-page site)
export function trackPage() {
  try {
    if (started.meta) window.fbq('track', 'PageView')
    if (started.tt) window.ttq.page()
  } catch { /* tracking must never break the site */ }
}

// customer sent an order request (value in DA)
export function trackOrder(value) {
  const v = Number(value) || 0
  try {
    if (started.meta) window.fbq('track', 'Lead', { value: v, currency: 'DZD' })
    if (started.tt) window.ttq.track('SubmitForm', { value: v, currency: 'DZD' })
  } catch { /* ignore */ }
}

// customer added something to the receipt
export function trackAdd(value) {
  const v = Number(value) || 0
  try {
    if (started.meta) window.fbq('track', 'AddToCart', { value: v, currency: 'DZD' })
    if (started.tt) window.ttq.track('AddToCart', { value: v, currency: 'DZD' })
  } catch { /* ignore */ }
}

// ---------- own visitor counter (Admin → Statistiques): anonymous, no cookie, no IP ----------
function visitorId() {
  try {
    let v = localStorage.getItem('pp_vid')
    if (!v) {
      const a = new Uint8Array(12)
      crypto.getRandomValues(a)
      v = Array.from(a, (x) => x.toString(16).padStart(2, '0')).join('')
      localStorage.setItem('pp_vid', v)
    }
    return v
  } catch { return 'v' + Math.random().toString(36).slice(2, 14).padEnd(10, '0') }
}

let lastVisit = ''
export function trackVisit() {
  try {
    const path = location.pathname
    const now = Date.now()
    if (lastVisit === path + '|' + Math.floor(now / 1500)) return // React StrictMode double effect
    lastVisit = path + '|' + Math.floor(now / 1500)
    const q = new URLSearchParams(location.search)
    let ref = q.get('utm_source') || ''
    if (!ref && document.referrer) {
      const h = new URL(document.referrer).hostname
      if (h && h !== location.hostname) ref = h
    }
    fetch('/api/track', {
      method: 'POST', keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vid: visitorId(), path, ref }),
    }).catch(() => {})
  } catch { /* the counter must never break the site */ }
}
