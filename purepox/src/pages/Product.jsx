import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'
import { fetchCatalogue } from '../lib/data'
import { calculate, money, WHOLESALE_FROM } from '../lib/calc'
import { waLink } from '../lib/whatsapp'
import { WaIcon } from '../components/WhatsAppButton'
import Bucket from '../components/Bucket'

const GROUPS = [
  ['surface', 'f_surface', [['concrete', 'surf_concrete'], ['smooth', 'surf_smooth']]],
  ['location', 'f_location', [['interior', 'loc_interior'], ['exterior', 'loc_exterior']]],
  ['thickness', 'f_thickness', [['lt1', 'th_lt1'], ['gt1', 'th_gt1']]],
]
const QUICK = [20, 50, 100, 200, 500]

export default function Product({ settings }) {
  const { id } = useParams()
  const { t, pick } = useLang()
  const { add, setOpen } = useCart()
  const [product, setProduct] = useState(undefined)
  const [colorId, setColorId] = useState(null)
  const [area, setArea] = useState('')
  const [opt, setOpt] = useState({ surface: null, location: null, thickness: null })
  const [need, setNeed] = useState(null)

  useEffect(() => {
    document.body.classList.add('on-product')
    return () => document.body.classList.remove('on-product')
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchCatalogue()
      .then((all) => {
        const p = all.find((x) => x.id === id) || null
        setProduct(p)
        setColorId(null)
        setOpt({ surface: null, location: null, thickness: null })
      })
      .catch(() => setProduct(null))
  }, [id])

  const color = useMemo(() => product?.colors?.find((c) => c.id === colorId), [product, colorId])
  const res = useMemo(() => calculate(product, color, area), [product, color, area])

  if (product === undefined) return <div className="container section"><p className="muted center">{t('loading')}</p></div>
  if (product === null) return <div className="container section"><Link to="/" className="back">{t('back')}</Link><p className="muted center">{t('none')}</p></div>

  const colors = product.colors.slice(0, 7)
  const retail = Number(color?.price ?? product.base_price) || 0
  const wholesale = Number(color?.price_wholesale) || 0
  const minRetail = Math.min(...colors.map((c) => Number(c.price ?? product.base_price) || Infinity))
  const shownRetail = color ? retail : (Number.isFinite(minRetail) ? minRetail : Number(product.base_price) || 0)
  const siteDone = Boolean(opt.surface && opt.location && opt.thickness)
  const ready = Boolean(siteDone && color && res)

  const pickOpt = (k, v) => { setOpt((o) => ({ ...o, [k]: v })); setNeed(null) }

  // first thing still missing -> scroll to it and highlight it
  const firstMissing = () => (!siteDone ? 'site' : !color ? 'color' : !res ? 'area' : null)
  const guard = () => {
    const miss = firstMissing()
    if (!miss) return true
    setNeed(miss)
    document.getElementById(`step-${miss}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return false
  }

  const line = () => ({
    productId: product.id, colorId: color.id,
    product_fr: product.name_fr, product_ar: product.name_ar || product.name_fr,
    color_fr: color.name_fr, color_ar: color.name_ar || color.name_fr, hex: color.hex,
    area: res.area, kg: res.kg, buckets: res.buckets, bucketKg: res.bucketKg,
    unitPrice: res.unitPrice, tier: res.tier, total: res.total,
    surface: opt.surface, location: opt.location, thickness: opt.thickness,
  })
  const order = () => { if (!guard()) return; add(line()); setOpen(true) }
  const more = () => { if (!guard()) return; add(line()); setArea('') }

  return (
    <div className="container pp">
      <Link to="/" className="back">{t('back')}</Link>

      <div className="pp-grid">
        {/* ---------- picture ---------- */}
        <div className="pp-media">
          <div className={`pp-art ${product.image_url ? 'photo' : ''}`}>
            {product.image_url
              ? <img src={product.image_url} alt={pick(product, 'name')} />
              : <Bucket key={colorId} hex={color?.hex || '#ec6b14'} className="pop" />}
            <span className="pp-fam">{t(`fam_${product.family}`)}</span>
            {color && (
              <div className="art-chip"><i style={{ background: color.hex }} /><span>{pick(color, 'name')}</span></div>
            )}
          </div>
        </div>

        {/* ---------- configurator ---------- */}
        <div className="pp-panel">
          <header className="pp-head">
            <h1>{pick(product, 'name')}</h1>
            {pick(product, 'desc') && <p className="lead">{pick(product, 'desc')}</p>}
            <div className="pp-facts">
              <div><small>{t('bucket_size')}</small><b>{product.bucket_kg} {t('kg')}</b></div>
              <div><small>{t('coverage')}</small><b>{product.coverage_m2_per_kg} {t('per_kg')}</b></div>
              <div><small>{t('price_bucket')}</small><b>{money(shownRetail)} {t('currency')}</b></div>
            </div>
            <div className="pp-tariffs">
              <div className={res?.tier === 'retail' ? 'on' : ''}>
                <span>{t('price_retail')}</span><em>{t('retail_hint')}</em>
                <b>{money(shownRetail)} {t('currency')}</b>
              </div>
              <div className={res?.tier === 'wholesale' ? 'on' : ''}>
                <span>{t('price_wholesale')}</span><em>{t('wholesale_hint')}</em>
                <b>{wholesale > 0 ? `${money(wholesale)} ${t('currency')}` : '—'}</b>
              </div>
            </div>
          </header>

          {/* step 1 */}
          <section id="step-site" className={`pp-step ${need === 'site' ? 'need' : ''} ${siteDone ? 'is-done' : ''}`}>
            <div className="pp-step-h"><span className="n">{siteDone ? '✓' : 1}</span><h2>{t('step_site')}</h2></div>
            {GROUPS.map(([key, label, opts]) => (
              <div className="pp-row" key={key}>
                <span className="pp-label">{t(label)}</span>
                <div className="pp-seg">
                  {opts.map(([v, k]) => (
                    <button key={v} type="button" className={opt[key] === v ? 'on' : ''} aria-pressed={opt[key] === v} onClick={() => pickOpt(key, v)}>{t(k)}</button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* step 2 */}
          <section id="step-color" className={`pp-step ${need === 'color' ? 'need' : ''} ${color ? 'is-done' : ''}`}>
            <div className="pp-step-h"><span className="n">{color ? '✓' : 2}</span><h2>{t('step_color')}</h2>
              {color && <span className="pp-pick"><b>{pick(color, 'name')}</b> · {money(retail)} {t('currency')}</span>}
            </div>
            <div className="pp-swatches">
              {colors.map((c) => (
                <button key={c.id} type="button" className={`pp-sw ${c.id === colorId ? 'on' : ''}`} onClick={() => { setColorId(c.id); setNeed(null) }} aria-label={pick(c, 'name')} title={pick(c, 'name')}>
                  <i style={{ background: c.hex }} />
                  <span>{pick(c, 'name')}</span>
                </button>
              ))}
            </div>
            <a className="other-color" href={waLink(settings?.whatsapp, `${t('ask_msg')}${pick(product, 'name')}`)} target="_blank" rel="noreferrer">{t('other_color')}</a>
          </section>

          {/* step 3 */}
          <section id="step-area" className={`pp-step ${need === 'area' ? 'need' : ''} ${res ? 'is-done' : ''}`}>
            <div className="pp-step-h"><span className="n">{res ? '✓' : 3}</span><h2>{t('step_area')}</h2></div>
            <label className="pp-area">
              <input type="number" min="0" step="any" inputMode="decimal" dir="ltr" value={area} placeholder={t('surface_ph')} onChange={(e) => { setArea(e.target.value); setNeed(null) }} />
              <span>{t('m2')}</span>
            </label>
            <div className="pp-quick">
              {QUICK.map((q) => <button key={q} type="button" className={Number(area) === q ? 'on' : ''} onClick={() => { setArea(String(q)); setNeed(null) }}>{q} {t('m2')}</button>)}
            </div>
          </section>

          {/* summary */}
          <section className="pp-sum">
            <h2>{t('summary')}</h2>
            {res ? (
              <>
                <dl>
                  <div><dt>{t('need_kg')}</dt><dd>{res.kg} {t('kg')}</dd></div>
                  <div><dt>{t('buckets')}</dt><dd>{res.buckets} × {res.bucketKg} {t('kg')}</dd></div>
                  <div><dt>{t('price_bucket')}</dt><dd>{money(res.unitPrice)} {t('currency')}</dd></div>
                </dl>
                <div className={`tier-note ${res.tier}`}>{res.tier === 'wholesale' ? `${t('applied_wholesale')} (≥ ${WHOLESALE_FROM} ${t('m2')})` : `${t('applied_retail')} (< ${WHOLESALE_FROM} ${t('m2')})`}</div>
                <div className="pp-total"><span>{t('total')}</span><b>{money(res.total)} {t('currency')}</b></div>
                {res.area >= WHOLESALE_FROM && (
                  <a className="big-project" href={waLink(settings?.whatsapp, `${pick(product, 'name')} — ${res.area} ${t('m2')}`)} target="_blank" rel="noreferrer"><WaIcon size={18} /> {t('big_project')}</a>
                )}
              </>
            ) : (
              <p className="muted">{t('enter_area')}</p>
            )}
            <div className="pp-actions">
              <button className="btn primary pp-order" onClick={order}>{t('order_btn')}</button>
              <button className="btn ghost" onClick={more}>{t('add_more')}</button>
            </div>
          </section>
        </div>
      </div>

      {/* phone: sticky order bar */}
      <div className="pp-bar">
        <div><small>{t('total')}</small><b>{res && ready ? `${money(res.total)} ${t('currency')}` : '—'}</b></div>
        <button className="btn primary" onClick={order}>{t('order_btn')}</button>
      </div>
    </div>
  )
}
