import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'
import { fetchCatalogue } from '../lib/data'
import { calculate, money } from '../lib/calc'
import { waLink } from '../lib/whatsapp'
import { WaIcon } from '../components/WhatsAppButton'

const fits = (v, wanted) => v === wanted || v === 'both'

export default function Solution({ settings }) {
  const { t, pick } = useLang()
  const { add, setOpen } = useCart()
  const [products, setProducts] = useState(null)
  const [a, setA] = useState({ family: null, surface: null, location: null, thickness: null })
  const [area, setArea] = useState('')
  const [finIdx, setFinIdx] = useState(0)
  const [colorId, setColorId] = useState(null)
  const [need, setNeed] = useState(null)

  useEffect(() => {
    document.body.classList.add('on-product')
    window.scrollTo(0, 0)
    fetchCatalogue().then(setProducts).catch(() => setProducts([]))
    return () => document.body.classList.remove('on-product')
  }, [])

  const set = (k, v) => { setA((o) => ({ ...o, [k]: v })); setFinIdx(0); setColorId(null); setNeed(null) }

  // products suggested for the answers: finishes (same family) + a primer for the support
  const finishes = useMemo(() => (products || []).filter((p) => (p.role || 'finition') === 'finition' && p.colors?.length &&
    a.family && p.family === a.family && a.surface && fits(p.surface, a.surface) && a.location && fits(p.location, a.location) && a.thickness && fits(p.thickness, a.thickness)), [products, a])
  const primers = useMemo(() => (products || []).filter((p) => p.role === 'primer' && p.colors?.length &&
    a.surface && fits(p.surface, a.surface) && a.location && fits(p.location, a.location))
    .sort((x, y) => (y.family === a.family) - (x.family === a.family)), [products, a])

  const fin = finishes[Math.min(finIdx, finishes.length - 1)] || null
  const pri = primers[0] || null
  const finColors = (fin?.colors || []).slice(0, 7)
  const color = finColors.find((c) => c.id === colorId) || null
  const m2 = Number(area)

  const finRes = useMemo(() => (fin && color ? calculate(fin, color, m2) : null), [fin, color, m2])
  const priColor = pri?.colors?.[0] || null
  const priRes = useMemo(() => (pri && priColor ? calculate(pri, priColor, m2) : null), [pri, priColor, m2])

  const answered = Boolean(a.family && a.surface && a.location && a.thickness)
  const ready = Boolean(answered && fin && color && finRes)
  const total = (finRes?.total || 0) + (priRes?.total || 0)
  const noMatch = answered && products && !fin

  const catalog_of = { concrete: settings?.catalog_concrete, smooth: settings?.catalog_smooth }

  const missing = () => (!answered ? 'choices' : !fin ? null : !m2 ? 'area' : !color ? 'color' : null)
  const guard = () => {
    const m = missing()
    if (!m) return true
    setNeed(m)
    document.getElementById(`sol-${m}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return false
  }

  const lineOf = (p, c, r, role) => ({
    productId: p.id, colorId: c.id, role,
    product_fr: p.name_fr, product_ar: p.name_ar || p.name_fr,
    color_fr: c.name_fr, color_ar: c.name_ar || c.name_fr, hex: c.hex,
    area: r.area, kg: r.kg, buckets: r.buckets, bucketKg: r.bucketKg, unitPrice: r.unitPrice, tier: r.tier, total: r.total,
    surface: a.surface, location: a.location, thickness: a.thickness,
  })
  const order = () => {
    if (!guard() || !ready) return
    if (pri && priRes) add(lineOf(pri, priColor, priRes, 'primer'))
    add(lineOf(fin, color, finRes, 'finition'))
    setOpen(true)
  }

  const askMsg = `${t('ask_msg')}${t(`fam_${a.family}`)} · ${t(`surf_${a.surface}`)} · ${t(`loc_${a.location}`)} · ${t(`th_${a.thickness}`)}`

  const seg = (k, opts) => (
    <div className="pp-seg sol-seg">
      {opts.map(([v, label, ex]) => (
        <button key={v} type="button" className={a[k] === v ? 'on' : ''} aria-pressed={a[k] === v} onClick={() => set(k, v)}>
          <b>{label}</b>{ex && <small>{ex}</small>}
        </button>
      ))}
    </div>
  )
  const catalog = catalog_of[a.surface]

  return (
    <div className="container pp sol">
      <div className="sol-head">
        <h1>{t('sol_title')}</h1>
        <p className="lead">{t('sol_sub')}</p>
      </div>

      <div className="sol-grid">
        <section className="sol-card">
          <div id="sol-choices" className={`sol-row ${need === 'choices' ? 'need' : ''}`}>
            <span className="pp-label">{t('f_family')}</span>
            {seg('family', [['epoxy', t('fam_epoxy')], ['polyurethane', t('fam_polyurethane')]])}
          </div>
          <div className="sol-row">
            <span className="pp-label">{t('f_surface')}</span>
            <div>
              {seg('surface', [['concrete', t('surf_concrete'), t('ex_concrete')], ['smooth', t('surf_smooth'), t('ex_smooth')]])}
              {catalog && <a className="sol-watch" href={catalog} target="_blank" rel="noreferrer">📄 {t('view_catalog')}</a>}
            </div>
          </div>
          <div className="sol-row">
            <span className="pp-label">{t('f_location')}</span>
            {seg('location', [['interior', t('loc_interior')], ['exterior', t('loc_exterior')]])}
          </div>
          <div className="sol-row">
            <span className="pp-label">{t('f_thickness')}</span>
            {seg('thickness', [['lt1', t('th_lt1')], ['gt1', t('th_gt1')]])}
          </div>
          <div id="sol-area" className={`sol-row ${need === 'area' ? 'need' : ''}`}>
            <span className="pp-label">{t('step_area')}</span>
            <label className="pp-area sol-area">
              <input type="number" min="0" step="any" inputMode="decimal" dir="ltr" value={area} placeholder={t('surface_ph')} onChange={(e) => { setArea(e.target.value); setNeed(null) }} />
              <span>{t('m2')}</span>
            </label>
          </div>
          {fin && (
            <div id="sol-color" className={`sol-row ${need === 'color' ? 'need' : ''}`}>
              <span className="pp-label">{t('step_color')}{color && <em className="sol-cname"> · {pick(color, 'name')}</em>}</span>
              <div>
                {finishes.length > 1 && (
                  <div className="sol-alt">
                    {finishes.map((p, i) => (
                      <button key={p.id} type="button" className={i === finIdx ? 'on' : ''} onClick={() => { setFinIdx(i); setColorId(null) }}>{pick(p, 'name')}</button>
                    ))}
                  </div>
                )}
                <div className="sol-sw">
                  {finColors.map((c) => (
                    <button key={c.id} type="button" className={c.id === colorId ? 'on' : ''} onClick={() => { setColorId(c.id); setNeed(null) }} aria-label={pick(c, 'name')} title={pick(c, 'name')}>
                      <i style={{ background: c.hex }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {fin && <a className="other-color sol-other" href={waLink(settings?.whatsapp, `${t('ask_msg')}${pick(fin, 'name')}`)} target="_blank" rel="noreferrer">{t('other_color')}</a>}
        </section>

        {/* ---------- suggestion ---------- */}
        <aside className="sol-result">
          <div className="pp-sum">
            <h2>{t('your_solution')}</h2>
            {!answered && <p className="muted">{t('sol_wait')}</p>}
            {noMatch && (
              <>
                <p className="muted">{t('sol_none')}</p>
                <a className="btn wa" href={waLink(settings?.whatsapp, askMsg)} target="_blank" rel="noreferrer"><WaIcon size={18} /> {t('ask_btn')}</a>
              </>
            )}
            {answered && fin && (
              <>
                {pri && (
                  <div className="sol-line">
                    <span className="role">{t('role_primer')}</span>
                    <b>{pick(pri, 'name')}</b>
                    {priRes
                      ? <div className="sol-qp"><span className="q">{priRes.buckets} × {priRes.bucketKg} {t('kg')} <em>({priRes.kg} {t('kg')})</em></span><span className="pr">{money(priRes.total)} {t('currency')}</span></div>
                      : <div className="q muted">{t('enter_area')}</div>}
                  </div>
                )}
                <div className="sol-line">
                  <span className="role fin">{t('role_finition')}</span>
                  <b>{pick(fin, 'name')}{color ? ` — ${pick(color, 'name')}` : ''}</b>
                  {finRes
                    ? <div className="sol-qp"><span className="q">{finRes.buckets} × {finRes.bucketKg} {t('kg')} <em>({finRes.kg} {t('kg')})</em></span><span className="pr">{money(finRes.total)} {t('currency')}</span></div>
                    : <div className="q muted">{!m2 ? t('enter_area') : t('pick_color')}</div>}
                </div>
                <div className="pp-total"><span>{t('total')}</span><b>{ready ? `${money(total)} ${t('currency')}` : '—'}</b></div>
                {m2 >= 200 && <a className="big-project" href={waLink(settings?.whatsapp, `${pick(fin, 'name')} — ${m2} ${t('m2')}`)} target="_blank" rel="noreferrer"><WaIcon size={18} /> {t('big_project')}</a>}
                <div className="pp-actions"><button className="btn primary pp-order" onClick={order}>{t('order_btn')}</button></div>
              </>
            )}
          </div>
        </aside>
      </div>

      <div className="pp-bar">
        <div><small>{t('total')}</small><b>{ready ? `${money(total)} ${t('currency')}` : '—'}</b></div>
        <button className="btn primary" onClick={order} disabled={noMatch}>{t('order_btn')}</button>
      </div>
    </div>
  )
}
