import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'

export default function Header() {
  const { lang, setLang, t } = useLang()
  const { items, setOpen } = useCart()
  const [menu, setMenu] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()

  // Esc closes the menu, the page behind does not scroll while it is open
  useEffect(() => {
    if (!menu) return
    const onKey = (e) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [menu])

  const go = (id) => {
    setMenu(false)
    if (loc.pathname !== '/') {
      nav('/')
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 120)
    } else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const links = [
    [t('nav_solution'), () => { setMenu(false); nav('/solution') }, true],
    [t('svc_title'), () => go('univers')],
    [t('nav_products'), () => go('produits')],
    [t('nav_how'), () => go('comment')],
    [t('nav_about'), () => go('apropos')],
    [t('nav_contact'), () => go('contact')],
  ]

  return (
    <header className="header">
      <div className="container header-in">
        <Link to="/" className="brand" onClick={() => setMenu(false)}>
          <img src="/logo.png" alt="DECO DZ" />
          <span className="brand-word"><b>DECO</b> <i>DZ</i></span>
        </Link>
        <div className="header-actions">
          <div className="lang">
            <button className={lang === 'fr' ? 'on' : ''} onClick={() => setLang('fr')}>FR</button>
            <button className={lang === 'ar' ? 'on' : ''} onClick={() => setLang('ar')}>عربي</button>
          </div>
          <button className="cart-btn" onClick={() => setOpen(true)} aria-label={t('cart')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
            {items.length > 0 && <span className="badge">{items.length}</span>}
          </button>
          <button className={`hb ${menu ? 'open' : ''}`} onClick={() => setMenu((m) => !m)} aria-label="menu" aria-expanded={menu} aria-controls="site-menu">
            <span /><span /><span />
          </button>
        </div>
      </div>

      {createPortal(
        <>
          <div className={`drawer-bg ${menu ? 'open' : ''}`} onClick={() => setMenu(false)} />
          <aside id="site-menu" className={`drawer ${menu ? 'open' : ''}`} aria-hidden={!menu}>
            <div className="drawer-top">
              <span className="brand-word"><b>DECO</b> <i>DZ</i></span>
              <button className="drawer-x" onClick={() => setMenu(false)} aria-label="close">×</button>
            </div>
            <nav className="drawer-nav">
              {links.map(([label, fn, hot], i) => (
                <button key={label} className={hot ? 'hot' : ''} tabIndex={menu ? 0 : -1} onClick={fn} style={{ '--i': i }}>
                  <em>{String(i + 1).padStart(2, '0')}</em>
                  <span>{label}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
              ))}
            </nav>
          </aside>
        </>,
        document.body
      )}
    </header>
  )
}
