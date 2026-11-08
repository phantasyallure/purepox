import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'
import { fetchCatalogue } from '../lib/data'
import { calculate, money } from '../lib/calc'
import { waLink } from '../lib/whatsapp'
import { WaIcon } from '../components/WhatsAppButton'

const QUICK = [20, 50, 100, 200, 500]
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

  const Opt = ({ k, v, label, sub, ex }) => (
    <div className={`sol-opt ${a[k] === v ? 'on' : ''}`}>
      <button type="button" aria-pressed={a[k] === v} onClick={() => set(k, v)}>
        <b>{label}</b>
        {sub && <small>{sub}</small>}
        {ex && <em>{ex}</em>}
      </button>
      {k === 'surface' && catalog_of[v] && (
        <a className="sol-watch" href={catalog_of[v]} target="_blank" rel="noreferrer">📄 {t('view_catalog')}</a>
      )}
    </div>
  )

  return (
    <div className="container pp sol">
      <Link to="/" className="back">{t('back')}</Link>
      <div className="sol-head">
        <h1>{t('sol_title')}</h1>
        <p className="lead">{t('sol_sub')}</p>
      </div>

      <div className="sol-grid">
        <div className="pp-panel">
          <section id="sol-choices" className={`pp-step ${need === 'choices' ? 'need' : ''} ${a.family ? 'is-done' : ''}`}>
            <div className="pp-step-h"><span className="n">{a.family ? '✓' : 1}</span><h2>{t('f_family')}</h2></div>
            <div className="sol-opts">
              <Opt k="family" v="epoxy" label={t('fam_epoxy')} sub={t('fam_ep_d')} />
              <Opt k="family" v="polyurethane" label={t('fam_polyurethane')} sub={t('fam_pu_d')} />
            </div>
          </section>

          <section className={`pp-step ${a.surface ? 'is-done' : ''}`}>
            <div className="pp-step-h"><span className="n">{a.surface ? '✓' : 2}</span><h2>{t('f_surface')}</h2></div>
            <div className="sol-opts">
              <Opt k="surface" v="concrete" label={t('surf_concrete')} ex={t('ex_concrete')} />
              <Opt k="surface" v="smooth" label={t('surf_smooth')} ex={t('ex_smooth')} />
            </div>
          </section>

          <section className={`pp-step ${a.location ? 'is-done' : ''}`}>
            <div className="pp-step-h"><span className="n">{a.location ? '✓' : 3}</span><h2>{t('f_location')}</h2></div>
            <div className="sol-opts">
              <Opt k="location" v="interior" label={t('loc_interior')} />
              <Opt k="location" v="exterior" label={t('loc_exterior')} />
            </div>
          </section>

          <section className={`pp-step ${a.thickness ? 'is-done' : ''}`}>
            <div className="pp-step-h"><span className="n">{a.thickness ? '✓' : 4}</span><h2>{t('f_thickness')}</h2></div>
            <div className="sol-opts">
              <Opt k="thickness" v="lt1" label={t('th_lt1')} />
              <Opt k="thickness" v="gt1" label={t('th_gt1')} />
            </div>
          </section>

          <section id="sol-area" className={`pp-step ${need === 'area' ? 'need' : ''} ${m2 > 0 ? 'is-done' : ''}`}>
            <div className="pp-step-h"><span className="n">{m2 > 0 ? '✓' : 5}</span><h2>{t('step_area')}</h2></div>
            <label className="pp-area">
              <input type="number" min="0" step="any" inputMode="decimal" dir="ltr" value={area} placeholder={t('surface_ph')} onChange={(e) => { setArea(e.target.value); setNeed(null) }} />
              <span>{t('m2')}</span>
            </label>
            <div className="pp-quick">
              {QUICK.map((q) => <button key={q} type="button" className={m2 === q ? 'on' : ''} onClick={() => { setArea(String(q)); setNeed(null) }}>{q} {t('m2')}</button>)}
            </div>
          </section>

          {fin && (
            <section id="sol-color" className={`pp-step ${need === 'color' ? 'need' : ''} ${color ? 'is-done' : ''}`}>
              <div className="pp-step-h"><span className="n">{color ? '✓' : 6}</span><h2>{t('step_color')}</h2>
                {color && <span className="pp-pick"><b>{pick(color, 'name')}</b></span>}
              </div>
              {finishes.length > 1 && (
                <div className="sol-alt">
                  {finishes.map((p, i) => (
                    <button key={p.id} type="button" className={i === finIdx ? 'on' : ''} onClick={() => { setFinIdx(i); setColorId(null) }}>{pick(p, 'name')}</button>
                  ))}
                </div>
              )}
              <div className="pp-swatches">
                {finColors.map((c) => (
                  <button key={c.id} type="button" className={`pp-sw ${c.id === colorId ? 'on' : ''}`} onClick={() => { setColorId(c.id); setNeed(null) }} aria-label={pick(c, 'name')} title={pick(c, 'name')}>
                    <i style={{ background: c.hex }} /><span>{pick(c, 'name')}</span>
                  </button>
                ))}
              </div>
              <a className="other-color" href={waLink(settings?.whatsapp, `${t('ask_msg')}${pick(fin, 'name')}`)} target="_blank" rel="noreferrer">{t('other_color')}</a>
            </section>
          )}
        </div>

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
                      ? <><div className="q">{priRes.buckets} × {priRes.bucketKg} {t('kg')} <em>({priRes.kg} {t('kg')})</em></div><div className="pr">{money(priRes.total)} {t('currency')}</div></>
                      : <div className="q muted">{t('enter_area')}</div>}
                  </div>
                )}
                <div className="sol-line">
                  <span className="role fin">{t('role_finition')}</span>
                  <b>{pick(fin, 'name')}{color ? ` — ${pick(color, 'name')}` : ''}</b>
                  {finRes
                    ? <><div className="q">{finRes.buckets} × {finRes.bucketKg} {t('kg')} <em>({finRes.kg} {t('kg')})</em></div><div className="pr">{money(finRes.total)} {t('currency')}</div></>
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
