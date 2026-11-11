import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'
import { submitOrder } from '../lib/data'
import { money, packsText } from '../lib/calc'

let geoCache = null
const loadGeo = () => (geoCache ? Promise.resolve(geoCache) : import('../lib/algeria.json').then((m) => (geoCache = m.default || m)))

function Thumb({ src, hex }) {
  return src ? <img className="rc-img" src={src} alt="" loading="lazy" /> : <span className="rc-img rc-dot" style={{ background: hex || '#e4e4e8' }} />
}

// The receipt: pictures, product, colour, quantities, tool, layers and prices
function Receipt({ items, total, onRemove }) {
  const { t, pick } = useLang()
  const X = ({ k }) => onRemove && <button type="button" className="link rc-x" onClick={() => onRemove(k)} aria-label={t('remove')}>×</button>
  return (
    <div className="rc">
      {items.map((i) => i.kind === 'calc' ? (
        <div className="rc-group" key={i.key}>
          <div className="rc-gh">
            <span>{t('sol_choice')} · {t(`fam_${i.info.family}`)} · {t(`surf_${i.info.support}`)} · {t(`loc_${i.info.location}`)} · {t(`th_${i.info.thickness}`)} · {i.info.area} {t('m2')}</span>
            <X k={i.key} />
          </div>
          {i.lines.map((l, k) => (
            <div className="rc-line" key={k}>
              <Thumb src={l.image_url} hex={l.hex} />
              <div className="rc-main">
                <span className="role-tag">{t(l.role === 'primer' ? 'role_primer' : 'role_finition')}</span>
                <strong>{pick(l, 'product')}</strong>
                {l.color_fr && <small><i className="dot sm" style={{ background: l.hex }} /> {pick(l, 'color')}{l.on_demand ? ` · ${t('color_requested')}` : ''}</small>}
                <small>{packsText(l.packs, t('kg'))} ({l.kg} {t('kg')})</small>
              </div>
              <div className={`rc-price ${l.on_demand ? 'od' : ''}`}>{l.on_demand ? t('on_demand') : `${money(l.total)} ${t('currency')}`}</div>
            </div>
          ))}
          <div className="rc-facts"><span>🖌️ {t(`tool_${i.info.tool}_d`)}</span><span>🧱 {t('layers_n')}</span></div>
        </div>
      ) : (
        <div className="rc-group" key={i.key}>
          <div className="rc-line">
            <Thumb src={i.image_url} hex={i.hex} />
            <div className="rc-main">
              <strong>{pick(i, 'product')}</strong>
              <small><i className="dot sm" style={{ background: i.hex }} /> {pick(i, 'color')}</small>
              <small>{i.qty} × {money(i.unitPrice)} {t('currency')}</small>
            </div>
            <div className="rc-price">{money(i.total)} {t('currency')}</div>
            <X k={i.key} />
          </div>
        </div>
      ))}
      <div className="sum"><span>{t('total')}</span><strong>{money(total)} {t('currency')}</strong></div>
    </div>
  )
}

export default function OrderModal() {
  const { t, lang } = useLang()
  const { items, open, setOpen, remove, clear, total } = useCart()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [wcode, setWcode] = useState('')
  const [commune, setCommune] = useState('')
  const [geo, setGeo] = useState(geoCache)
  const [state, setState] = useState('idle') // idle | sending | done
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { if (open && !geo) loadGeo().then(setGeo).catch(() => {}) }, [open, geo])

  if (!open) return null

  const close = () => { setOpen(false); if (state === 'done') { setState('idle'); setReceipt(null) } }
  const wilaya = geo?.find((w) => w[0] === wcode)
  const nm = (fr, ar) => (lang === 'ar' && ar ? ar.trim() : fr)

  const send = async (e) => {
    e.preventDefault()
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (name.trim().length < 2 || digits.length < 9 || !wilaya || !commune || items.length === 0) { setError(t('err_fields')); return }
    setState('sending')
    try {
      const snapshot = { items, total }
      const res = await submitOrder({
        name: name.trim(), phone: phone.trim(),
        wilaya: `${wilaya[0]} - ${wilaya[1]}`, commune,
        // the server recomputes quantities and prices from the database
        items: items.map((i) => (i.kind === 'calc' ? { kind: 'calc', ...i.answers } : { kind: 'catalog', product_id: i.productId, color_id: i.colorId, qty: i.qty })),
      })
      setReceipt({ ...snapshot, ref: res?.ref, name: name.trim(), where: `${nm(wilaya[1], wilaya[2])} · ${commune}` })
      clear(); setName(''); setPhone(''); setWcode(''); setCommune(''); setState('done')
    } catch (err) {
      console.error(err)
      setError(t('err_send')); setState('idle')
    }
  }

  return (
    <div className="modal-back" onClick={close}>
      <div className="modal receipt" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-x" onClick={close} aria-label={t('close')}>×</button>
        {state === 'done' && receipt ? (
          <div className="done-rc">
            <div className="done">
              <div className="check">✓</div>
              <h3>{t('done_t')}</h3>
              <p className="muted">{t('done_d')}</p>
            </div>
            <div className="rc-meta">
              {receipt.ref && <span>{t('receipt_ref')} <b>{receipt.ref}</b></span>}
              <span>{receipt.name}</span>
              <span>{t('delivery_to')} : {receipt.where}</span>
            </div>
            <Receipt items={receipt.items} total={receipt.total} />
            <div className="rc-btns">
              <button className="btn ghost" onClick={() => window.print()}>{t('print')}</button>
              <button className="btn primary" onClick={close}>{t('close')}</button>
            </div>
          </div>
        ) : (
          <>
            <h3>{t('your_order')}</h3>
            {items.length === 0 ? (
              <p className="muted">{t('empty_cart')}</p>
            ) : (
              <>
                <Receipt items={items} total={total} onRemove={remove} />
                <form onSubmit={send} className="form">
                  <h4 className="rc-sub">{t('your_info')}</h4>
                  <label>{t('full_name')}
                    <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                  </label>
                  <label>{t('phone_field')}
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required />
                  </label>
                  <div className="form two">
                    <label>{t('wilaya')}
                      <select value={wcode} onChange={(e) => { setWcode(e.target.value); setCommune('') }} required>
                        <option value="">{geo ? t('pick_wilaya') : t('loading')}</option>
                        {(geo || []).map((w) => <option key={w[0]} value={w[0]}>{w[0]} - {nm(w[1], w[2])}</option>)}
                      </select>
                    </label>
                    <label>{t('commune')}
                      <select value={commune} onChange={(e) => setCommune(e.target.value)} disabled={!wilaya} required>
                        <option value="">{t('pick_commune')}</option>
                        {(wilaya?.[3] || []).map((c) => <option key={c[0]} value={c[0]}>{nm(c[0], c[1])}</option>)}
                      </select>
                    </label>
                  </div>
                  {error && <div className="error">{error}</div>}
                  <button className="btn primary block" disabled={state === 'sending'}>
                    {state === 'sending' ? t('sending') : t('submit')}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
