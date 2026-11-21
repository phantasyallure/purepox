import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { Ico } from '../lib/ico'

// Admin → Statistiques: visitors, orders and revenue. Charts are plain SVG (no library).
// One colour per measure everywhere: visitors blue · page views orange · orders green · revenue yellow.
const C = { visitors: 'var(--an-visitors)', views: 'var(--an-views)', orders: 'var(--an-orders)', revenue: 'var(--an-revenue)' }

const nf = (n, d = 0) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: d }).replace(/\u202f/g, '\u00a0')
const compact = (n) => {
  n = Number(n) || 0
  if (n < 10000) return nf(n)
  if (n < 1e6) return `${nf(n / 1e3, 1)} K`
  return `${nf(n / 1e6, 1)} M`
}
const da = (n) => `${nf(Math.round(Number(n) || 0))} DA`
const dayShort = (d) => `${d.slice(8)}/${d.slice(5, 7)}`
const dayLong = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

function niceTicks(max, integer) {
  if (!(max > 0)) return { top: integer ? 4 : 1, ticks: integer ? [0, 1, 2, 3, 4] : [0, 1] }
  let step = max / 4
  const mag = Math.pow(10, Math.floor(Math.log10(step)))
  const n = step / mag
  step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag
  if (integer) step = Math.max(1, Math.ceil(step))
  const top = Math.ceil(max / step) * step
  const ticks = []
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v)
  return { top, ticks }
}

/* ---------- time chart: area / line / bar on ONE axis, crosshair + tooltip, keyboard arrows ---------- */
function TimeChart({ data, series, integer, fmt = nf, height = 232, label }) {
  const wrap = useRef(null)
  const [w, setW] = useState(680)
  const [hi, setHi] = useState(null)

  useEffect(() => {
    const el = wrap.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = data.length
  const bars = series.some((s) => s.kind === 'bar')
  const max = Math.max(0, ...series.flatMap((s) => data.map((d) => d[s.key] || 0)))
  const { top, ticks } = niceTicks(max, integer)
  const mt = 22
  const ih = height - mt - 28
  const Y = (v) => mt + ih - ((v || 0) / top) * ih

  // end-of-line series names: only when there are 2+ lines whose ends do not collide (else legend + tooltip carry it)
  const ends = series.filter((s) => s.kind !== 'bar').map((s) => ({ s, y: Y(data[n - 1]?.[s.key]) }))
  const endsOk = w > 520 && ends.length > 1 && ends.every((a, i) => ends.every((b, j) => i === j || Math.abs(a.y - b.y) >= 15))
  const m = { t: mt, r: endsOk ? 86 : 16, b: 28, l: 48 }
  const iw = w - m.l - m.r
  const band = iw / Math.max(n, 1)
  const X = (i) => (bars ? m.l + band * i + band / 2 : m.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw))
  const every = n <= 8 ? 1 : Math.ceil(n / (w < 460 ? 4 : 7))

  const at = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    const i = bars ? Math.floor(px / band) : Math.round((px / iw) * (n - 1))
    setHi(Math.min(n - 1, Math.max(0, i)))
  }
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setHi((h) => Math.max(0, (h ?? n) - 1)) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setHi((h) => Math.min(n - 1, (h ?? -1) + 1)) }
    else if (e.key === 'Escape') setHi(null)
  }

  const line = (k) => data.map((d, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(d[k]).toFixed(1)}`).join('')
  const area = (k) => `${line(k)}L${X(n - 1).toFixed(1)},${Y(0).toFixed(1)}L${X(0).toFixed(1)},${Y(0).toFixed(1)}Z`
  const barPath = (i, v) => {
    const bw = Math.max(2, Math.min(24, band - 2))
    const x0 = X(i) - bw / 2
    const y0 = Y(0)
    const y1 = Y(v)
    const h = y0 - y1
    if (h <= 0.5) return ''
    const r = Math.min(4, bw / 2, h)
    return `M${x0},${y0}V${y1 + r}Q${x0},${y1} ${x0 + r},${y1}H${x0 + bw - r}Q${x0 + bw},${y1} ${x0 + bw},${y1 + r}V${y0}Z`
  }

  // selective label: the peak, when there is a single series
  const peakSeries = series.length === 1 ? series[0] : null
  const peakI = peakSeries && max > 0 ? data.findIndex((d) => (d[peakSeries.key] || 0) === max) : -1

  const tipLeft = hi != null ? X(hi) : 0
  const flip = hi != null && tipLeft > w * 0.58

  return (
    <div className="an-chart" ref={wrap} style={{ height }} tabIndex={0} role="group" aria-label={`${label}. Flèches gauche et droite pour parcourir les jours.`}
      onKeyDown={onKey} onFocus={() => setHi((h) => h ?? n - 1)} onBlur={() => setHi(null)}>
      <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} aria-hidden="true">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={w - m.r} y1={Y(t)} y2={Y(t)} className="an-grid" />
            <text x={m.l - 8} y={Y(t) + 4} textAnchor="end" className="an-tick">{compact(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (i % every === 0 ? <text key={d.d} x={X(i)} y={height - 8} textAnchor="middle" className="an-tick">{dayShort(d.d)}</text> : null))}

        {hi != null && bars && <rect x={m.l + band * hi} y={m.t} width={band} height={ih} className="an-wash" />}
        {hi != null && !bars && <line x1={X(hi)} x2={X(hi)} y1={m.t} y2={m.t + ih} className="an-cross" />}

        {series.filter((s) => s.kind === 'area').map((s) => <path key={`a${s.key}`} d={area(s.key)} style={{ fill: s.color, fillOpacity: 0.1 }} />)}
        {series.filter((s) => s.kind === 'area' || s.kind === 'line').map((s) => <path key={`l${s.key}`} d={line(s.key)} className="an-line" style={{ stroke: s.color }} />)}
        {series.filter((s) => s.kind === 'bar').map((s) => data.map((d, i) => <path key={`${s.key}${i}`} d={barPath(i, d[s.key])} style={{ fill: s.color, opacity: hi == null || hi === i ? 1 : 0.55 }} />))}

        {hi != null && !bars && series.map((s) => <circle key={s.key} cx={X(hi)} cy={Y(data[hi][s.key])} r="4.5" className="an-dot" style={{ fill: s.color }} />)}

        {endsOk && ends.map(({ s, y }) => <text key={s.key} x={X(n - 1) + 10} y={y + 4} className="an-end">{s.label}</text>)}
        {peakI >= 0 && (
          <text x={Math.min(w - m.r - 4, Math.max(m.l + 4, X(peakI)))} y={Y(max) - 8} textAnchor="middle" className="an-end">{fmt === nf ? nf(max) : compact(max)}</text>
        )}

        {max === 0 && <text x={m.l + iw / 2} y={m.t + ih / 2} textAnchor="middle" className="an-none">Aucune donnée sur cette période</text>}
        <rect x={m.l} y={m.t} width={iw} height={ih} fill="transparent" onPointerMove={at} onPointerDown={at} onPointerLeave={() => setHi(null)} />
      </svg>

      {hi != null && data[hi] && (
        <div className="an-tip" style={{ left: tipLeft, top: m.t, transform: flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}>
          <small>{dayLong(data[hi].d)}</small>
          {series.map((s) => (
            <div key={s.key}><i style={{ background: s.color }} /><b>{fmt(data[hi][s.key] || 0)}</b><span>{s.label}</span></div>
          ))}
        </div>
      )}
    </div>
  )
}

function DataTable({ data, series, fmt }) {
  return (
    <div className="an-table">
      <table>
        <thead><tr><th>Jour</th>{series.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
        <tbody>
          {[...data].reverse().map((d) => (
            <tr key={d.d}><td>{dayLong(d.d)}</td>{series.map((s) => <td key={s.key}>{fmt(d[s.key] || 0)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChartCard({ title, sub, icon, series, data, integer, fmt = nf }) {
  const [table, setTable] = useState(false)
  return (
    <section className="ad-card an-card">
      <div className="an-card-h">
        <div><h3><Ico n={icon} size={18} /> {title}</h3>{sub && <p>{sub}</p>}</div>
        <div className="an-seg" role="group" aria-label="Affichage">
          <button type="button" className={!table ? 'on' : ''} onClick={() => setTable(false)} aria-label="Graphique" title="Graphique"><Ico n="chart" /></button>
          <button type="button" className={table ? 'on' : ''} onClick={() => setTable(true)} aria-label="Tableau" title="Tableau"><Ico n="table" /></button>
        </div>
      </div>
      {series.length > 1 && (
        <div className="an-legend">
          {series.map((s) => <span key={s.key}><i className={s.kind === 'line' ? 'ln' : ''} style={{ background: s.color }} />{s.label}</span>)}
        </div>
      )}
      {table ? <DataTable data={data} series={series} fmt={fmt} /> : <TimeChart data={data} series={series} integer={integer} fmt={fmt} label={title} />}
    </section>
  )
}

/* ---------- ranked list (one colour, bar length = value) ---------- */
function Rank({ title, sub, icon, rows, color, fmt = nf, empty }) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <section className="ad-card an-card">
      <div className="an-card-h"><div><h3><Ico n={icon} size={18} /> {title}</h3>{sub && <p>{sub}</p>}</div></div>
      {rows.length === 0 ? <div className="an-empty">{empty}</div> : (
        <ol className="an-rank">
          {rows.map((r) => (
            <li key={r.name} title={`${r.label || r.name} : ${fmt(r.n)}`}>
              <div className="an-rk-t"><span>{r.label || r.name}</span><b>{fmt(r.n)}</b></div>
              <div className="an-rk-bar"><i style={{ width: `${Math.max(2, (r.n / max) * 100)}%`, background: color }} /></div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* ---------- one whole split in parts (devices) ---------- */
const DEVICE_COLOR = { Mobile: 'var(--an-visitors)', Ordinateur: '#a9a9b3', Tablette: '#cfcfd6' }
function Split({ rows }) {
  const total = rows.reduce((s, r) => s + r.n, 0)
  return (
    <section className="ad-card an-card">
      <div className="an-card-h"><div><h3><Ico n="users" size={18} /> Appareils</h3><p>Visiteurs selon l'appareil utilisé</p></div></div>
      {total === 0 ? <div className="an-empty">Pas encore de visiteurs.</div> : (
        <>
          <div className="an-split" role="img" aria-label={rows.map((r) => `${r.name} ${Math.round((r.n / total) * 100)} %`).join(', ')}>
            {rows.map((r) => <i key={r.name} title={`${r.name} : ${nf(r.n)} (${nf((r.n / total) * 100)} %)`} style={{ width: `${(r.n / total) * 100}%`, background: DEVICE_COLOR[r.name] || '#cfcfd6' }} />)}
          </div>
          <ul className="an-split-l">
            {rows.map((r) => (
              <li key={r.name}><i style={{ background: DEVICE_COLOR[r.name] || '#cfcfd6' }} /><span>{r.name}</span><b>{nf((r.n / total) * 100)} %</b><em>{nf(r.n)}</em></li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/* ---------- stat tile: label · value · change vs the previous period ---------- */
function Tile({ icon, color, label, value, cur, prev, days, points }) {
  let cls = 'flat'
  let text = '—'
  let arrow = 'flat'
  if (points) {
    const d = cur - prev
    if (cur > 0 || prev > 0) { cls = d > 0.05 ? 'up' : d < -0.05 ? 'down' : 'flat'; text = `${d > 0 ? '+' : ''}${nf(d, 1)} pt`; arrow = cls }
  } else if (prev > 0) {
    const d = ((cur - prev) / prev) * 100
    cls = d > 0.5 ? 'up' : d < -0.5 ? 'down' : 'flat'; text = `${d > 0 ? '+' : ''}${nf(d, 0)} %`; arrow = cls
  } else if (cur > 0) { cls = 'up'; text = 'Nouveau'; arrow = 'up' }
  return (
    <div className="ad-stat an-tile">
      <span><i className="an-chip" style={{ background: color }}><Ico n={icon} size={14} /></i>{label}</span>
      <b>{value}</b>
      <small className={`an-delta ${cls}`}><Ico n={arrow} size={13} /> {text} <em>vs {days} j préc.</em></small>
    </div>
  )
}

const pageName = (p) => (p.label ? p.label : p.name === '/' ? 'Accueil' : p.name === '/solution' ? 'Calculer mon besoin' : p.name)

export default function Stats() {
  const [days, setDays] = useState(() => { try { return [7, 30, 90].includes(Number(localStorage.getItem('an_days'))) ? Number(localStorage.getItem('an_days')) : 30 } catch { return 30 } })
  const [d, setD] = useState(null)
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let off = false
    setBusy(true); setErr('')
    api(`/api/admin/analytics?days=${days}`)
      .then((r) => { if (!off) setD(r) })
      .catch(() => { if (!off) setErr('Impossible de charger les statistiques. Réessayez dans un instant.') })
      .finally(() => { if (!off) setBusy(false) })
    try { localStorage.setItem('an_days', String(days)) } catch { /* ignore */ }
    return () => { off = true }
  }, [days])

  if (err && !d) return <div className="ad-error">{err}</div>
  if (!d) return <div className="an-loading">Chargement…</div>

  const t = d.totals
  const p = d.prev
  const conv = (o, v) => (v > 0 ? (o / v) * 100 : 0)
  const firstDay = d.first_visit ? new Date(d.first_visit).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const partial = !d.first_visit || new Date(d.first_visit).toISOString().slice(0, 10) > d.from

  return (
    <div className={`an ${busy ? 'busy' : ''}`}>
      <div className="an-filter">
        <div className="ad-pills" role="group" aria-label="Période">
          {[7, 30, 90].map((n) => <button key={n} type="button" className={days === n ? 'on' : ''} onClick={() => setDays(n)}>{n} jours</button>)}
        </div>
        {err && <span className="an-err">{err}</span>}
      </div>

      {partial && (
        <div className="ad-auto an-note"><Ico n="info" /> {firstDay
          ? `Les visiteurs sont comptés depuis le ${firstDay} : avant cette date, seules les commandes et le chiffre d'affaires sont disponibles.`
          : "Le comptage des visiteurs vient de démarrer : les graphiques se rempliront au fil des visites. Vos commandes et votre chiffre d'affaires sont déjà à jour."}</div>
      )}

      <div className="an-kpis">
        <Tile icon="users" color={C.visitors} label="Visiteurs" value={compact(t.visitors)} cur={t.visitors} prev={p.visitors} days={days} />
        <Tile icon="eye" color={C.views} label="Pages vues" value={compact(t.views)} cur={t.views} prev={p.views} days={days} />
        <Tile icon="bag" color={C.orders} label="Commandes" value={compact(t.orders)} cur={t.orders} prev={p.orders} days={days} />
        <Tile icon="coins" color={C.revenue} label="Chiffre d'affaires" value={`${compact(t.revenue)} DA`} cur={t.revenue} prev={p.revenue} days={days} />
        <Tile icon="percent" color="#6250d6" label="Conversion" value={`${nf(conv(t.orders, t.visitors), 1)} %`} cur={conv(t.orders, t.visitors)} prev={conv(p.orders, p.visitors)} days={days} points />
      </div>

      <ChartCard title="Trafic" sub="Visiteurs uniques et pages vues, par jour" icon="users" data={d.series}
        series={[{ key: 'visitors', label: 'Visiteurs', color: C.visitors, kind: 'area' }, { key: 'views', label: 'Pages vues', color: C.views, kind: 'line' }]} />

      <div className="an-two">
        <ChartCard title="Commandes" sub="Nombre de commandes par jour" icon="bag" data={d.series} integer
          series={[{ key: 'orders', label: 'Commandes', color: C.orders, kind: 'bar' }]} />
        <ChartCard title="Chiffre d'affaires" sub="En DA, commandes annulées exclues" icon="coins" data={d.series} fmt={da}
          series={[{ key: 'revenue', label: "Chiffre d'affaires", color: C.revenue, kind: 'area' }]} />
      </div>

      <div className="an-two">
        <Rank title="Meilleurs produits" sub="Selon le montant commandé" icon="box" color={C.revenue} fmt={da} rows={d.products} empty="Aucune commande sur cette période." />
        <Rank title="Villes" sub="Commandes par wilaya" icon="pin" color={C.orders} rows={d.wilayas} empty="Aucune commande sur cette période." />
      </div>

      <div className="an-two">
        <Rank title="Sources" sub="D'où viennent vos visiteurs" icon="globe" color={C.visitors} rows={d.sources} empty="Pas encore de visiteurs." />
        <Rank title="Pages populaires" sub="Pages vues" icon="file" color={C.views} rows={d.pages.map((x) => ({ name: x.name, label: pageName(x), n: x.n }))} empty="Pas encore de visiteurs." />
      </div>

      <Split rows={d.devices} />
    </div>
  )
}
