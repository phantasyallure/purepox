import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

// Pick a localized string from {fr, ar} or a plain string
function pick(v, lang) {
  if (!v) return ''
  if (typeof v === 'string') return v
  return v[lang] || v.fr || v.ar || ''
}

export default function Product({ settings }) {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | missing | error
  const [colorIdx, setColorIdx] = useState(0)

  const lang = (typeof document !== 'undefined' && document.documentElement.lang) === 'ar' ? 'ar' : 'fr'

  useEffect(() => {
    let alive = true
    setStatus('loading')
    fetch('/api/public')
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        const list = Array.isArray(data) ? data : data.products || data.items || []
        const found = list.find((p) => String(p.id) === String(id))
        if (found) {
          setProduct(found)
          setStatus('ok')
        } else {
          setStatus('missing')
        }
      })
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [id])

  if (status === 'loading') return <div className="mt-splash" />
  if (status !== 'ok') {
    return (
      <section style={{ padding: '60px 20px', textAlign: 'center' }}>
        <p>{status === 'missing' ? 'Produit introuvable.' : 'Erreur de chargement.'}</p>
        <Link to="/solution">← Retour</Link>
      </section>
    )
  }

  const colors = Array.isArray(product.colors) ? product.colors : []
  const color = colors[colorIdx]
  const name = pick(product.name, lang)
  const desc = pick(product.desc, lang)
  const price = color?.price ?? product.price
  const image = color?.image || product.image || product.image_url

  const wa = String(settings?.whatsapp || '').replace(/\D/g, '')
  const msg = encodeURIComponent(
    `Bonjour, je veux commander : ${name}${color ? ' - ' + (color.name_fr || color.name || '') : ''}`
  )

  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '30px 20px' }}>
      <Link to="/solution">← Retour</Link>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30, marginTop: 20 }}>
        {image && (
          <img
            src={image}
            alt={name}
            style={{ flex: '1 1 320px', maxWidth: '100%', borderRadius: 12, objectFit: 'cover' }}
          />
        )}
        <div style={{ flex: '1 1 320px' }}>
          <h1>{name}</h1>
          {desc && <p style={{ whiteSpace: 'pre-line' }}>{desc}</p>}

          {colors.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
              {colors.map((c, i) => (
                <button
                  key={c.id ?? i}
                  onClick={() => setColorIdx(i)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: i === colorIdx ? '2px solid currentColor' : '1px solid #888',
                    background: c.hex || 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {c.name_fr || c.name || `#${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {price != null && <p style={{ fontSize: 24, fontWeight: 700 }}>{price} DA</p>}

          {wa && (
            <a
              href={`https://wa.me/${wa}?text=${msg}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                padding: '12px 22px',
                borderRadius: 10,
                background: '#25D366',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Commander sur WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
