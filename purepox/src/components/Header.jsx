import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'

export default function Header() {
  const { lang, setLang, t } = useLang()
  const { items, setOpen } = useCart()
  const [menu, setMenu] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()

  const go = (id) => {
    setMenu(false)
    if (loc.pathname !== '/') {
      nav('/')
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 120)
    } else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="header">
      <div className="container header-in">
        <Link to="/" className="brand" onClick={() => setMenu(false)}>
          <img src="/logo.jpg" alt="Purepox" />
        </Link>
        <nav className={`nav ${menu ? 'open' : ''}`}>
          <button onClick={() => { setMenu(false); nav('/solution') }}>{t('nav_solution')}</button>
          <button onClick={() => go('produits')}>{t('nav_products')}</button>
          <button onClick={() => go('comment')}>{t('nav_how')}</button>
          <button onClick={() => go('apropos')}>{t('nav_about')}</button>
          <button onClick={() => go('contact')}>{t('nav_contact')}</button>
        </nav>
        <div className="header-actions">
          <div className="lang">
            <button className={lang === 'fr' ? 'on' : ''} onClick={() => setLang('fr')}>FR</button>
            <button className={lang === 'ar' ? 'on' : ''} onClick={() => setLang('ar')}>عربي</button>
          </div>
          <button className="cart-btn" onClick={() => setOpen(true)} aria-label={t('cart')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
            {items.length > 0 && <span className="badge">{items.length}</span>}
          </button>
          <button className="burger" onClick={() => setMenu((m) => !m)} aria-label="menu">
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  )
}
