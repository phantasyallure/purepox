import { waLink } from '../lib/whatsapp'
import { WaIcon } from '../components/WhatsAppButton'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { fetchCatalogue } from '../lib/data'
import { money } from '../lib/calc'
import Reveal from '../components/Reveal'
import Bucket from '../components/Bucket'
import Tags from '../components/Tags'

function minPrice(p) {
  const prices = (p.colors || []).map((c) => Number(c.price ?? p.base_price)).filter(Boolean)
  return prices.length ? Math.min(...prices) : Number(p.base_price) || 0
}

// a product with "both" matches either choice
const matches = (value, wanted) => wanted === 'all' || value === wanted || value === 'both'
const FILTERS = [
  ['surface', 'f_surface', [['concrete', 'surf_concrete'], ['smooth', 'surf_smooth']]],
  ['location', 'f_location', [['interior', 'loc_interior'], ['exterior', 'loc_exterior']]],
  ['thickness', 'f_thickness', [['lt1', 'th_lt1'], ['gt1', 'th_gt1']]],
]
const START = { family: 'all', surface: 'all', location: 'all', thickness: 'all' }

export default function Home({ settings }) {
  const { t, pick } = useLang()
  const [products, setProducts] = useState(null)
  const [f, setF] = useState(START)
  const setFilter = (k, v) => setF((o) => ({ ...o, [k]: o[k] === v ? 'all' : v }))
  const filtered = useMemo(
    () => (products || []).filter((p) =>
      (f.family === 'all' || p.family === f.family) &&
      matches(p.surface, f.surface) && matches(p.location, f.location) && matches(p.thickness, f.thickness)),
    [products, f]
  )
  const filtering = Object.values(f).some((v) => v !== 'all')

  useEffect(() => {
    fetchCatalogue().then(setProducts).catch(() => setProducts([]))
  }, [])

  const s = settings || {}
  const scroll = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <>
      <section className="hero">
        <div className="blob b1" /><div className="blob b2" />
        <div className="container hero-in">
          <div className="hero-text">
            <span className="kicker">{t('hero_kicker')}</span>
            <h1>{t('hero_title')}</h1>
            <p>{t('hero_sub')}</p>
            <div className="hero-cta">
              <button className="btn primary" onClick={() => scroll('produits')}>{t('hero_cta')}</button>
              <button className="btn ghost" onClick={() => scroll('comment')}>{t('hero_cta2')}</button>
            </div>
          </div>
          <div className="hero-art">
            <div className="ring" />
            <Bucket hex="#ec6b14" className="float" />
          </div>
        </div>
      </section>

      <section id="produits" className="section">
        <div className="container">
          <Reveal><h2 className="title">{t('products_title')}</h2><p className="sub">{t('products_sub')}</p></Reveal>
          <Reveal>
            <div className="fam-tabs" role="tablist">
              {[['all', 'fam_all'], ['polyurethane', 'fam_polyurethane'], ['epoxy', 'fam_epoxy']].map(([v, k]) => (
                <button key={v} role="tab" aria-selected={f.family === v} className={f.family === v ? 'on' : ''} onClick={() => setF((o) => ({ ...o, family: v }))}>{t(k)}</button>
              ))}
            </div>
            <div className="filters">
              {FILTERS.map(([key, label, opts]) => (
                <div className="fgroup" key={key}>
                  <span className="flabel">{t(label)}</span>
                  <div className="chips">
                    {opts.map(([v, k]) => (
                      <button key={v} className={`chip ${f[key] === v ? 'on' : ''}`} aria-pressed={f[key] === v} onClick={() => setFilter(key, v)}>{t(k)}</button>
                    ))}
                  </div>
                </div>
              ))}
              {filtering && <button className="freset" onClick={() => setF(START)}>↺ {t('f_reset')}</button>}
            </div>
          </Reveal>

          {products === null ? (
            <p className="muted center">{t('loading')}</p>
          ) : products.length === 0 ? (
            <p className="muted center">{t('none')}</p>
          ) : (
            <>
              <p className="count">{filtered.length} {t('f_count')}</p>
              {filtered.length > 0 && (
                <div className="grid" key={JSON.stringify(f)}>
                  {filtered.map((p, i) => (
                    <div className="grid-in" key={p.id} style={{ animationDelay: `${i * 60}ms` }}>
                      <Link to={`/produit/${p.id}`} className="card">
                        <div className={`card-art ${p.image_url ? 'photo' : ''}`}>
                          {p.image_url
                            ? <img src={p.image_url} alt={pick(p, 'name')} loading="lazy" />
                            : <Bucket hex={p.colors?.[0]?.hex || '#ec6b14'} />}
                          <span className="fam-badge">{t(`fam_${p.family}`)}</span>
                          <div className="swatches">
                            {(p.colors || []).slice(0, 7).map((c) => <i key={c.id} style={{ background: c.hex }} />)}
                          </div>
                        </div>
                        <div className="card-body">
                          <h3>{pick(p, 'name')}</h3>
                          <Tags p={p} />
                          <p>{pick(p, 'desc')}</p>
                          <div className="card-foot">
                            <div>
                              <small>{t('from')}</small>
                              <strong>{money(minPrice(p))} {t('currency')}</strong>
                              <small> / {t('per_bucket')}</small>
                            </div>
                            <span className="pill">{t('view')} →</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
              {filtered.length === 0 && <p className="muted center nomatch">{t('no_match')}</p>}
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
          <div className="contact-grid">
            {s.phone && (
              <Reveal className="contact-card">
                <small>{t('phone')}</small>
                <a href={`tel:${s.phone.replace(/\s/g, '')}`} dir="ltr">{s.phone}</a>
                {s.phone2 && <a href={`tel:${s.phone2.replace(/\s/g, '')}`} dir="ltr">{s.phone2}</a>}
              </Reveal>
            )}
            {s.email && <Reveal className="contact-card" delay={80}><small>{t('email')}</small><a href={`mailto:${s.email}`}>{s.email}</a></Reveal>}
            {pick(s, 'address') && <Reveal className="contact-card" delay={160}><small>{t('address')}</small><span>{pick(s, 'address')}</span></Reveal>}
            {pick(s, 'hours') && <Reveal className="contact-card" delay={240}><small>{t('hours')}</small><span>{pick(s, 'hours')}</span></Reveal>}
          </div>
          <div className="center" style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {s.phone && <a className="btn primary" href={`tel:${s.phone.replace(/\s/g, '')}`}>{t('call_us')}</a>}
            <a className="btn wa" href={waLink(s.whatsapp)} target="_blank" rel="noreferrer"><WaIcon size={20} /> WhatsApp</a>
          </div>
        </div>
      </section>
    </>
  )
}
