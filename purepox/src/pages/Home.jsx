import { waLink } from '../lib/whatsapp'
import { WaIcon } from '../components/WhatsAppButton'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { fetchCatalogue } from '../lib/data'
import { money } from '../lib/calc'
import Reveal from '../components/Reveal'
import Bucket from '../components/Bucket'
import { PhoneIcon, MailIcon, PinIcon, ClockIcon, InstagramIcon, FacebookIcon } from '../components/Icons'

const ic = (d) => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
const SVC_ICONS = [
  ic(<><path d="M5 8h12a2 2 0 0 1 2 2v1H5z" /><path d="M7 8V5h8v3" /><path d="M19 10h2v5h-8v3" /><rect x="11" y="18" width="4" height="4" rx="1" /></>),
  ic(<><path d="m12 3 9 4-9 4-9-4z" /><path d="m3 12 9 4 9-4" /><path d="m3 17 9 4 9-4" /></>),
  ic(<><path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6z" /><path d="M12 9c1.6 2 2.5 3 2.5 4.3a2.5 2.5 0 0 1-5 0C9.5 12 10.4 11 12 9z" /></>),
  ic(<><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M12 12c1.4 1.7 2.2 2.6 2.2 3.7a2.2 2.2 0 0 1-4.4 0c0-1.1.8-2 2.2-3.7z" /></>),
  ic(<><path d="M14 4 20 10 10 20 4 14z" /><path d="m4 14-1 6 6-1" /><path d="m12 6 6 6" /></>),
]

const hasRange = (p) => new Set((p.colors || []).map((c) => Number(c.price ?? p.base_price)).filter(Boolean)).size > 1

function minPrice(p) {
  const prices = (p.colors || []).map((c) => Number(c.price ?? p.base_price)).filter(Boolean)
  return prices.length ? Math.min(...prices) : Number(p.base_price) || 0
}

export default function Home({ settings }) {
  const { t, pick } = useLang()
  const [products, setProducts] = useState(null)

  useEffect(() => {
    fetchCatalogue().then(setProducts).catch(() => setProducts([]))
  }, [])

  const s = settings || {}
  const scroll = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <>
      <section className="hero">
        <div className="hero-bg" />
        <div className="blob b1" /><div className="blob b2" />
        <div className="container hero-in">
          <div className="hero-text">
            <span className="kicker">{t('hero_kicker')}</span>
            <h1>{t('hero_title')}</h1>
            <p>{t('hero_sub')}</p>
            <div className="hero-cta">
              <Link className="btn primary" to="/solution">{t('hero_cta')}</Link>
              <button className="btn ghost" onClick={() => scroll('produits')}>{t('hero_cta2')}</button>
            </div>
          </div>
          <div className="hero-art">
            <div className="ring" />
            <Bucket hex="#c9971c" className="float" />
          </div>
        </div>
        <div className="container">
          <div className="hero-stats">
            {[1, 2, 3].map((n) => (
              <div key={n}><b>{t(`stat_${n}_n`)}</b><span>{t(`stat_${n}_l`)}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section id="univers" className="section svc-sec">
        <div className="container">
          <Reveal><h2 className="title">{t('svc_title')}</h2><p className="sub">{t('svc_sub')}</p></Reveal>
          <div className="svc-grid">
            {[1, 2, 3, 4, 5].map((n) => (
              <Reveal key={n} delay={n * 60} className="svc">
                <span className="svc-ic">{SVC_ICONS[n - 1]}</span>
                <h3>{t(`svc_${n}`)}</h3>
                <p>{t(`svc_${n}_d`)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="produits" className="section">
        <div className="container">
          <Reveal><h2 className="title">{t('products_title')}</h2><p className="sub">{t('products_sub')}</p></Reveal>
          {products === null ? (
            <p className="muted center">{t('loading')}</p>
          ) : products.length === 0 ? (
            <p className="muted center">{t('none')}</p>
          ) : (
            <>
              <p className="count">{products.length} {t('f_count')}</p>
              {products.length > 0 && (
                <div className="grid">
                  {products.map((p, i) => (
                    <div className="grid-in" key={p.id} style={{ animationDelay: `${i * 60}ms` }}>
                      <Link to={`/produit/${p.id}`} className="card">
                        <div className={`card-art ${p.image_url ? 'photo' : ''}`}>
                          {p.image_url
                            ? <img src={p.image_url} alt={pick(p, 'name')} loading="lazy" />
                            : <Bucket hex={p.colors?.[0]?.hex || '#c9971c'} />}
                          <div className="swatches">
                            {(p.colors || []).slice(0, 7).map((c) => <i key={c.id} style={{ background: c.hex }} />)}
                          </div>
                        </div>
                        <div className="card-body">
                          <h3>{pick(p, 'name')}</h3>
                          <p>{pick(p, 'desc')}</p>
                          <div className="card-foot">
                            <div>
                              {hasRange(p) && <small>{t('from')}</small>}
                              <strong>{money(minPrice(p))} {t('currency')}</strong>
                            </div>
                            <span className="pill">{t('view')} →</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <Reveal className="ask">
            <div>
              <h3>{t('ask_title')}</h3>
              <p>{t('ask_sub')}</p>
            </div>
            <a className="btn wa" href={waLink(s.whatsapp, t('ask_msg'))} target="_blank" rel="noreferrer"><WaIcon size={20} /> {t('ask_btn')}</a>
          </Reveal>
        </div>
      </section>

      <section id="comment" className="section alt">
        <div className="container">
          <Reveal><h2 className="title">{t('how_title')}</h2></Reveal>
          <div className="steps">
            {[1, 2, 3, 4].map((n) => (
              <Reveal key={n} delay={n * 80} className="step">
                <span className="num">{n}</span>
                <h3>{t(`how_${n}_t`)}</h3>
                <p>{t(`how_${n}_d`)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="apropos" className="section">
        <div className="container about">
          <Reveal className="about-text">
            <h2 className="title left">{t('about_title')}</h2>
            <p>{t('about_p')}</p>
          </Reveal>
          <div className="about-list">
            {[1, 2, 3, 4].map((n) => (
              <Reveal key={n} delay={n * 70} className="about-item"><i />{t(`about_${n}`)}</Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="section dark">
        <div className="container">
          <Reveal><h2 className="title light">{t('contact_title')}</h2></Reveal>
          {(() => {
            const addr = pick(s, 'address')
            const isUrl = /^https?:\/\//i.test(addr || '')
            const phoneHref = (n) => `tel:${String(n).replace(/\s/g, '')}`
            // icon card: the whole card is the link
            const Card = ({ cls, icon, label, value, href, delay, ext }) => {
              const body = (
                <>
                  <span className={`ic-badge ${cls}`}>{icon}</span>
                  <b>{label}</b>
                  {value && <span className="ic-val">{value}</span>}
                </>
              )
              return (
                <Reveal className="contact-card ic" delay={delay}>
                  {href ? <a className="ic-in" href={href} {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>{body}</a> : <div className="ic-in">{body}</div>}
                </Reveal>
              )
            }
            return (
              <div className="contact-grid ic-grid">
                {s.phone && <Card cls="phone" icon={<PhoneIcon />} label={t('phone')} value={<span dir="ltr">{s.phone}</span>} href={phoneHref(s.phone)} />}
                <Card cls="wa" icon={<WaIcon size={26} />} label="WhatsApp" href={waLink(s.whatsapp)} ext delay={60} />
                {s.instagram && <Card cls="ig" icon={<InstagramIcon />} label="Instagram" href={s.instagram} ext delay={120} />}
                {s.facebook && <Card cls="fb" icon={<FacebookIcon />} label="Facebook" href={s.facebook} ext delay={180} />}
                {s.email && <Card cls="mail" icon={<MailIcon />} label={t('email')} href={`mailto:${s.email}`} delay={240} />}
                {addr && <Card cls="pin" icon={<PinIcon />} label={isUrl ? t('see_map') : t('address')} value={isUrl ? '' : addr} href={isUrl ? addr : ''} ext delay={300} />}
                {pick(s, 'hours') && <Card cls="clock" icon={<ClockIcon />} label={t('hours')} value={pick(s, 'hours')} delay={360} />}
              </div>
            )
          })()}
          <div className="center" style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {s.phone && <a className="btn primary" href={`tel:${s.phone.replace(/\s/g, '')}`}>{t('call_us')}</a>}
            <a className="btn wa" href={waLink(s.whatsapp)} target="_blank" rel="noreferrer"><WaIcon size={20} /> WhatsApp</a>
          </div>
        </div>
      </section>
    </>
  )
}
