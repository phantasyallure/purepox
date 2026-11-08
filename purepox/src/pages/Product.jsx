import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'
import { fetchCatalogue } from '../lib/data'
import { calculate, money } from '../lib/calc'
import Bucket from '../components/Bucket'
import { waLink } from '../lib/whatsapp'
import { WaIcon } from '../components/WhatsAppButton'
import { WHOLESALE_FROM } from '../lib/calc'

export default function Product({ settings }) {
  const { id } = useParams()
  const { t, pick } = useLang()
  const { add, setOpen } = useCart()
  const [product, setProduct] = useState(undefined)
  const [colorId, setColorId] = useState(null)
  const [area, setArea] = useState('')
  const [opt, setOpt] = useState({ surface: null, location: null, thickness: null })
  const pickOpt = (k, v) => setOpt((o) => ({ ...o, [k]: v }))

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
  const chosen = Boolean(color && opt.surface && opt.location && opt.thickness)

  if (product === undefined) return <div className="container section"><p className="muted center">{t('loading')}</p></div>
  if (product === null) return <div className="container section"><Link to="/" className="back">{t('back')}</Link><p className="muted center">{t('none')}</p></div>

  const line = () => ({
    productId: product.id, colorId: color.id,
    product_fr: product.name_fr, product_ar: product.name_ar || product.name_fr,
    color_fr: color.name_fr, color_ar: color.name_ar || color.name_fr, hex: color.hex,
    area: res.area, kg: res.kg, buckets: res.buckets, bucketKg: res.bucketKg,
    unitPrice: res.unitPrice, tier: res.tier, total: res.total,
    surface: opt.surface, location: opt.location, thickness: opt.thickness,
  })
  const order = () => { if (!res || !chosen) return; add(line()); setOpen(true) }
  const more = () => { if (!res || !chosen) return; add(line()); setArea('') }
  const retail = Number(color?.price ?? product.base_price) || 0
  const wholesale = Number(color?.price_wholesale) || 0

  return (
    <div className="container product">
      <Link to="/" className="back">{t('back')}</Link>
      <div className="product-grid">
        <div className="product-art">
          <div className={`art-card ${product.image_url ? 'photo' : 'bucket-bg'}`}>
            {product.image_url
              ? <img src={product.image_url} alt={pick(product, 'name')} />
              : <Bucket key={colorId} hex={color?.hex || '#ec6b14'} className="pop" />}
            {color && (
              <div className="art-chip">
                <i style={{ background: color.hex }} />
                <span>{pick(color, 'name')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="product-info">
          <h1>{pick(product, 'name')}</h1>
          <span className="fam-badge inline">{t(`fam_${product.family}`)}</span>
          <p className="lead">{pick(product, 'desc')}</p>
          <div className="specs">
            <div><small>{t('bucket_size')}</small><b>{product.bucket_kg} {t('kg')}</b></div>
            <div><small>{t('coverage')}</small><b>{product.coverage_m2_per_kg} {t('per_kg')}</b></div>
          </div>

          <div className="tiers">
            <div className={res && res.tier === 'retail' ? 'on' : ''}>
              <small>{t('price_retail')} · {t('retail_hint')}</small>
              <b>{money(retail)} {t('currency')}</b>
            </div>
            {wholesale > 0 && (
              <div className={res && res.tier === 'wholesale' ? 'on' : ''}>
                <small>{t('price_wholesale')} · {t('wholesale_hint')}</small>
                <b>{money(wholesale)} {t('currency')}</b>
              </div>
            )}
          </div>

          <div className="choices">
            {[
              ['surface', 'f_surface', [['concrete', 'surf_concrete'], ['smooth', 'surf_smooth']]],
              ['location', 'f_location', [['interior', 'loc_interior'], ['exterior', 'loc_exterior']]],
              ['thickness', 'f_thickness', [['lt1', 'th_lt1'], ['gt1', 'th_gt1']]],
            ].map(([key, label, opts]) => (
              <div className="choice" key={key}>
                <h4 className="label">{t(label)}</h4>
                <div className="chips">
                  {opts.map(([v, k]) => (
                    <button key={v} type="button" className={`chip big ${opt[key] === v ? 'on' : ''}`} aria-pressed={opt[key] === v} onClick={() => pickOpt(key, v)}>{t(k)}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <h4 className="label">{t('color')} {color && <span className="muted">— {pick(color, 'name')}</span>}</h4>
          <div className="colors">
            {product.colors.slice(0, 7).map((c) => (
              <button key={c.id} className={`color ${c.id === colorId ? 'on' : ''}`} onClick={() => setColorId(c.id)}>
                <i style={{ background: c.hex }} />
                <span>{pick(c, 'name')}</span>
                <b>{money(c.price ?? product.base_price)} {t('currency')}</b>
              </button>
            ))}
          </div>
          <a className="other-color" href={waLink(settings?.whatsapp, `${t('ask_msg')}${pick(product, 'name')}`)} target="_blank" rel="noreferrer">{t('other_color')}</a>

          <div className="calc">
            <h4>{t('calc_title')}</h4>
            <label className="area">
              <span>{t('surface')}</span>
              <input
                type="number" min="0" step="any" inputMode="decimal" dir="ltr"
                value={area} placeholder={t('surface_ph')} onChange={(e) => setArea(e.target.value)}
              />
            </label>
            {res ? (
              <div className="result">
                <div><small>{t('need_kg')}</small><b>{res.kg} {t('kg')}</b></div>
                <div><small>{t('buckets')}</small><b>{res.buckets} × {res.bucketKg} {t('kg')}</b></div>
                <div><small>{t('price_bucket')}</small><b>{money(res.unitPrice)} {t('currency')}</b></div>
                <div className="grand"><small>{t('total')}</small><b>{money(res.total)} {t('currency')}</b></div>
                <div className={`tier-note ${res.tier}`}>{res.tier === 'wholesale' ? `${t('applied_wholesale')} (≥ ${WHOLESALE_FROM} ${t('m2')})` : `${t('applied_retail')} (< ${WHOLESALE_FROM} ${t('m2')})`}</div>
              </div>
            ) : (
              <p className="muted">{t('enter_area')}</p>
            )}
            {res && res.area >= WHOLESALE_FROM && (
              <a className="big-project" href={waLink(settings?.whatsapp, `${pick(product, 'name')} — ${res.area} ${t('m2')}`)} target="_blank" rel="noreferrer"><WaIcon size={18} /> {t('big_project')}</a>
            )}
            {!chosen && <p className="muted need-choice">{t('make_choices')}</p>}
            <div className="calc-actions">
              <button className="btn primary" disabled={!res || !chosen} onClick={order}>{t('order_btn')}</button>
              <button className="btn ghost" disabled={!res || !chosen} onClick={more}>{t('add_more')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
