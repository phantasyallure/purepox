import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'
import { fetchCatalogue } from '../lib/data'
import { calculate, money } from '../lib/calc'
import Bucket from '../components/Bucket'

export default function Product() {
  const { id } = useParams()
  const { t, pick } = useLang()
  const { add, setOpen } = useCart()
  const [product, setProduct] = useState(undefined)
  const [colorId, setColorId] = useState(null)
  const [area, setArea] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchCatalogue()
      .then((all) => {
        const p = all.find((x) => x.id === id) || null
        setProduct(p)
        setColorId(p?.colors?.[0]?.id ?? null)
      })
      .catch(() => setProduct(null))
  }, [id])

  const color = useMemo(() => product?.colors?.find((c) => c.id === colorId), [product, colorId])
  const res = useMemo(() => calculate(product, color, area), [product, color, area])

  if (product === undefined) return <div className="container section"><p className="muted center">{t('loading')}</p></div>
  if (product === null) return <div className="container section"><Link to="/" className="back">{t('back')}</Link><p className="muted center">{t('none')}</p></div>

  const line = () => ({
    productId: product.id, colorId: color.id,
    product_fr: product.name_fr, product_ar: product.name_ar || product.name_fr,
    color_fr: color.name_fr, color_ar: color.name_ar || color.name_fr, hex: color.hex,
    area: res.area, kg: res.kg, buckets: res.buckets, bucketKg: res.bucketKg,
    unitPrice: res.unitPrice, total: res.total,
  })
  const order = () => { if (!res || !color) return; add(line()); setOpen(true) }
  const more = () => { if (!res || !color) return; add(line()); setArea('') }
  const unit = Number(color?.price ?? product.base_price) || 0

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
          <p className="lead">{pick(product, 'desc')}</p>
          <div className="specs">
            <div><small>{t('bucket_size')}</small><b>{product.bucket_kg} {t('kg')}</b></div>
            <div><small>{t('coverage')}</small><b>{product.coverage_m2_per_kg} {t('per_kg')}</b></div>
          </div>

          <h4 className="label">{t('color')} {color && <span className="muted">— {pick(color, 'name')}</span>}</h4>
          <div className="colors">
            {product.colors.map((c) => (
              <button key={c.id} className={`color ${c.id === colorId ? 'on' : ''}`} onClick={() => setColorId(c.id)}>
                <i style={{ background: c.hex }} />
                <span>{pick(c, 'name')}</span>
                <b>{money(c.price ?? product.base_price)} {t('currency')}</b>
              </button>
            ))}
          </div>

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
                <div><small>{t('price_bucket')}</small><b>{money(unit)} {t('currency')}</b></div>
                <div className="grand"><small>{t('total')}</small><b>{money(res.total)} {t('currency')}</b></div>
              </div>
            ) : (
              <p className="muted">{t('enter_area')}</p>
            )}
            <div className="calc-actions">
              <button className="btn primary" disabled={!res || !color} onClick={order}>{t('order_btn')}</button>
              <button className="btn ghost" disabled={!res || !color} onClick={more}>{t('add_more')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
