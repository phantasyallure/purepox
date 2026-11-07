import { useState } from 'react'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'
import { submitOrder } from '../lib/data'
import { money } from '../lib/calc'

export default function OrderModal() {
  const { t, pick } = useLang()
  const { items, open, setOpen, remove, clear, total } = useCart()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState('idle') // idle | sending | done
  const [error, setError] = useState('')

  if (!open) return null

  const close = () => { setOpen(false); if (state === 'done') setState('idle') }

  const send = async (e) => {
    e.preventDefault()
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (name.trim().length < 2 || digits.length < 9 || items.length === 0) { setError(t('err_fields')); return }
    setState('sending')
    try {
      await submitOrder({
        name: name.trim(),
        phone: phone.trim(),
        total,
        items: items.map((i) => ({
          product_fr: i.product_fr, product_ar: i.product_ar,
          color_fr: i.color_fr, color_ar: i.color_ar, hex: i.hex,
          area_m2: i.area, kg: i.kg, buckets: i.buckets, bucket_kg: i.bucketKg,
          unit_price: i.unitPrice, total: i.total,
        })),
      })
      clear(); setName(''); setPhone(''); setState('done')
    } catch (err) {
      console.error(err)
      setError(t('err_send')); setState('idle')
    }
  }

  return (
    <div className="modal-back" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-x" onClick={close} aria-label={t('close')}>×</button>
        {state === 'done' ? (
          <div className="done">
            <div className="check">✓</div>
            <h3>{t('done_t')}</h3>
            <p className="muted">{t('done_d')}</p>
            <button className="btn primary" onClick={close}>{t('close')}</button>
          </div>
        ) : (
          <>
            <h3>{t('your_order')}</h3>
            {items.length === 0 ? (
              <p className="muted">{t('empty_cart')}</p>
            ) : (
              <>
                <ul className="lines">
                  {items.map((i) => (
                    <li key={i.key}>
                      <span className="dot" style={{ background: i.hex }} />
                      <div className="line-main">
                        <strong>{pick(i, 'product')}</strong>
                        <small>{pick(i, 'color')} · {i.area} {t('m2')} · {i.kg} {t('kg')} · {i.buckets} {t('buckets_short')}</small>
                      </div>
                      <div className="line-price">{money(i.total)} {t('currency')}</div>
                      <button className="link" onClick={() => remove(i.key)} aria-label={t('remove')}>×</button>
                    </li>
                  ))}
                </ul>
                <div className="sum"><span>{t('total')}</span><strong>{money(total)} {t('currency')}</strong></div>
                <form onSubmit={send} className="form">
                  <label>{t('full_name')}
                    <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                  </label>
                  <label>{t('phone_field')}
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required />
                  </label>
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
