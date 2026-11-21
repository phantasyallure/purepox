import { json } from '../../_lib/util.js'

// Admin → Statistiques. Days are Algerian days (UTC+1, no daylight saving).
const DAY = 86400e3
const TZ = 3600e3
const ymd = (ms) => new Date(ms + TZ).toISOString().slice(0, 10)

export async function onRequestGet({ request, env }) {
  const asked = Number(new URL(request.url).searchParams.get('days'))
  const days = [7, 30, 90].includes(asked) ? asked : 30

  const todayStart = Math.floor((Date.now() + TZ) / DAY) * DAY - TZ
  const from = todayStart - (days - 1) * DAY
  const F = new Date(from).toISOString()
  const P = new Date(from - days * DAY).toISOString()
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a)
  const ok = `status != 'cancelled'`

  const [vDay, oDay, vTot, vPrev, oPrev, pages, srcs, devs, wil, rows, first] = await Promise.all([
    q(`SELECT date(ts,'+1 hour') AS d, COUNT(*) AS views, COUNT(DISTINCT vid) AS visitors FROM visits WHERE ts >= ? GROUP BY d`, F).all(),
    q(`SELECT date(created_at,'+1 hour') AS d, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue FROM orders WHERE created_at >= ? AND ${ok} GROUP BY d`, F).all(),
    q(`SELECT COUNT(*) AS views, COUNT(DISTINCT vid) AS visitors FROM visits WHERE ts >= ?`, F).first(),
    q(`SELECT COUNT(*) AS views, COUNT(DISTINCT vid) AS visitors FROM visits WHERE ts >= ? AND ts < ?`, P, F).first(),
    q(`SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue FROM orders WHERE created_at >= ? AND created_at < ? AND ${ok}`, P, F).first(),
    q(`SELECT path AS name, COUNT(*) AS n FROM visits WHERE ts >= ? GROUP BY path ORDER BY n DESC LIMIT 6`, F).all(),
    q(`SELECT CASE WHEN ref IS NULL OR ref = '' THEN 'Direct' ELSE ref END AS name, COUNT(DISTINCT vid) AS n FROM visits WHERE ts >= ? GROUP BY name ORDER BY n DESC LIMIT 6`, F).all(),
    q(`SELECT device AS name, COUNT(DISTINCT vid) AS n FROM visits WHERE ts >= ? GROUP BY device ORDER BY n DESC`, F).all(),
    q(`SELECT wilaya AS name, COUNT(*) AS n FROM orders WHERE created_at >= ? AND ${ok} AND COALESCE(wilaya,'') != '' GROUP BY wilaya ORDER BY n DESC LIMIT 6`, F).all(),
    q(`SELECT items FROM orders WHERE created_at >= ? AND ${ok} LIMIT 5000`, F).all(),
    q(`SELECT MIN(ts) AS t FROM visits`).first(),
  ])

  const vBy = Object.fromEntries((vDay.results || []).map((r) => [r.d, r]))
  const oBy = Object.fromEntries((oDay.results || []).map((r) => [r.d, r]))
  const series = []
  for (let i = 0; i < days; i++) {
    const d = ymd(from + i * DAY)
    series.push({ d, visitors: vBy[d]?.visitors || 0, views: vBy[d]?.views || 0, orders: oBy[d]?.orders || 0, revenue: oBy[d]?.revenue || 0 })
  }
  const orders = series.reduce((s, x) => s + x.orders, 0)
  const revenue = series.reduce((s, x) => s + x.revenue, 0)

  // best products = money brought in, from the receipt lines of each order
  const byProduct = {}
  for (const r of rows.results || []) {
    let items = []
    try { items = JSON.parse(r.items) || [] } catch { /* ignore */ }
    for (const it of items) {
      const name = it?.product_fr
      if (!name) continue
      byProduct[name] = (byProduct[name] || 0) + (Number(it.total) || 0)
    }
  }
  const products = Object.entries(byProduct).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, n]) => ({ name, n }))

  // /produit/<id> -> product name
  const popular = pages.results || []
  const ids = [...new Set(popular.map((p) => (p.name.match(/^\/produit\/(.+)$/) || [])[1]).filter(Boolean))]
  if (ids.length) {
    const names = await env.DB.prepare(`SELECT id, name_fr FROM products WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()
    const by = Object.fromEntries((names.results || []).map((r) => [r.id, r.name_fr]))
    for (const p of popular) {
      const id = (p.name.match(/^\/produit\/(.+)$/) || [])[1]
      if (id && by[id]) p.label = by[id]
    }
  }

  return json({
    days, series, first_visit: first?.t || null, from: ymd(from),
    totals: { visitors: vTot?.visitors || 0, views: vTot?.views || 0, orders, revenue },
    prev: { visitors: vPrev?.visitors || 0, views: vPrev?.views || 0, orders: oPrev?.orders || 0, revenue: oPrev?.revenue || 0 },
    pages: popular, sources: srcs.results || [], devices: devs.results || [], wilayas: wil.results || [], products,
  }, 200, { 'cache-control': 'no-store' })
}
