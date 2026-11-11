import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'
import { fetchCatalogue } from '../lib/data'
import { money } from '../lib/calc'
import { waLink } from '../lib/whatsapp'
import Bucket from '../components/Bucket'

// Normal product: name, photo, description, colours with their price. The client picks a colour and a number of buckets.
export default function Product({ settings }) {
  const { id } = useParams()
  const { t, pick } = useLang()
  const { add, setOpen } = useCart()
  const [product, setProduct] = useState(undefined)
  const [colorId, setColorId] = useState(null)
  const [qty, setQty] = useState(1)
  const [need, setNeed] = useState(false)

  useEffect(() => {
    document.body.classList.add('on-product')
    return () => document.body.classList.remove('on-product')
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchCatalogue()
      .then((all) => { setProduct(all.find((x) => x.id === id) || null); setColorId(null); setQty(1) })
      .catch(() => setProduct(null))
  }, [id])

  const color = useMemo(() => product?.colors?.find((c) => c.id === colorId), [product, colorId])

  if (product === undefined) return <div className="container section"><p className="muted center">{t('loading')}</p></div>
  if (product === null) return <div className="container section"><Link to="/" className="back">{t('back')}</Link><p className="muted center">{t('none')}</p></div>

  const priceOf = (c) => Number(c?.price ?? product.base_price) || 0
  const prices = product.colors.map(priceOf).filter(Boolean)
  const shown = color ? priceOf(color) : prices.length ? Math.min(...prices) : Number(product.base_price) || 0
  const total = color ? priceOf(color) * qty : 0
  const bump = (d) => setQty((q) => Math.min(500, Math.max(1, q + d)))

  const order = () => {
    if (!color) { setNeed(true); document.getElementById('step-color')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return }
    add({
      kind: 'catalog', productId: product.id, colorId: color.id, qty,
      product_fr: product.name_fr, product_ar: product.name_ar || product.name_fr, image_url: product.image_url || '',
      color_fr: color.name_fr, color_ar: color.name_ar || color.name_fr, hex: color.hex, unitPrice: priceOf(color), total,
    })
    setOpen(true)
  }

  return (
    <div className="container pp">
      <Link to="/" className="back">{t('back')}</Link>
      <div className="pp-grid">
        <div className="pp-media">
          <div className={`pp-art ${product.image_url ? 'photo' : ''}`}>
            {product.image_url
              ? <img src={product.image_url} alt={pick(product, 'name')} />
              : <Bucket key={colorId} hex={color?.hex || '#ec6b14'} className="pop" />}
            {color && <div className="art-chip"><i style={{ background: color.hex }} /><span>{pick(color, 'name')}</span></div>}
          </div>
        </div>

        <div className="pp-panel">
          <header className="pp-head">
            <h1>{pick(product, 'name')}</h1>
            {pick(product, 'desc') && <p className="lead">{pick(product, 'desc')}</p>}
            <div className="pp-facts one"><div><small>{t('price_bucket')}</small><b>{color ? '' : `${t('from')} `}{money(shown)} {t('currency')}</b></div></div>
          </header>

          <section id="step-color" className={`pp-step ${need && !color ? 'need' : ''} ${color ? 'is-done' : ''}`}>
            <div className="pp-step-h"><span className="n">{color ? '✓' : 1}</span><h2>{t('step_color')}</h2>
              {color && <span className="pp-pick"><b>{pick(color, 'name')}</b> · {money(priceOf(color))} {t('currency')}</span>}
            </div>
            <div className="pp-swatches">
              {product.colors.map((c) => (
                <button key={c.id} type="button" className={`pp-sw ${c.id === colorId ? 'on' : ''}`} onClick={() => { setColorId(c.id); setNeed(false) }} aria-label={pick(c, 'name')} title={`${pick(c, 'name')} — ${money(priceOf(c))} ${t('currency')}`}>
                  <i style={{ background: c.hex }} />
                  <span>{pick(c, 'name')}</span>
                  <small className="pp-sw-price">{money(priceOf(c))}</small>
                </button>
              ))}
            </div>
            <a className="other-color" href={waLink(settings?.whatsapp, `${t('ask_msg')}${pick(product, 'name')}`)} target="_blank" rel="noreferrer">{t('other_color')}</a>
          </section>

          <section className="pp-step is-done">
            <div className="pp-step-h"><span className="n">2</span><h2>{t('qty_buckets')}</h2></div>
            <div className="pp-qty">
              <button type="button" onClick={() => bump(-1)} aria-label="-">−</button>
              <input type="number" min="1" max="500" inputMode="numeric" dir="ltr" value={qty} onChange={(e) => setQty(Math.min(500, Math.max(1, Math.floor(Number(e.target.value)) || 1)))} />
              <button type="button" onClick={() => bump(1)} aria-label="+">+</button>
            </div>
          </section>

          <section className="pp-sum">
            <div className="pp-total"><span>{t('total')}</span><b>{color ? `${money(total)} ${t('currency')}` : '—'}</b></div>
            <div className="pp-actions"><button className="btn primary pp-order" onClick={order}>{t('order_btn')}</button></div>
          </section>
        </div>
      </div>

      <div className="pp-bar">
        <div><small>{t('total')}</small><b>{color ? `${money(total)} ${t('currency')}` : '—'}</b></div>
        <button className="btn primary" onClick={order}>{t('order_btn')}</button>
      </div>
    </div>
  )
}
