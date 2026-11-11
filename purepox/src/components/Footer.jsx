import { useLang } from '../lib/i18n'
import { waLink, waDigits } from '../lib/whatsapp'
import { InstagramIcon, FacebookIcon } from './Icons'

export default function Footer({ settings }) {
  const { t, pick } = useLang()
  const s = settings || {}
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <img className="footer-logo" src="/logo.jpg" alt="Purepox" />
          <p className="muted">{t('about_p')}</p>
        </div>
        <div>
          <h4>{t('footer_links')}</h4>
          <ul>
            {[['produits', 'nav_products'], ['comment', 'nav_how'], ['apropos', 'nav_about'], ['contact', 'nav_contact']].map(([id, k]) => (
              <li key={id}><button onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>{t(k)}</button></li>
            ))}
          </ul>
        </div>
        <div>
          <h4>{t('nav_contact')}</h4>
          <ul>
            {s.phone && <li><a href={`tel:${s.phone.replace(/\s/g, '')}`} dir="ltr">{s.phone}</a></li>}
            {s.phone2 && <li><a href={`tel:${s.phone2.replace(/\s/g, '')}`} dir="ltr">{s.phone2}</a></li>}
            <li><a href={waLink(s.whatsapp)} target="_blank" rel="noreferrer" dir="ltr">WhatsApp +{waDigits(s.whatsapp)}</a></li>
            {s.email && <li><a href={`mailto:${s.email}`}>{s.email}</a></li>}
            {pick(s, 'address') && !/^https?:\/\//i.test(pick(s, 'address')) && <li>{pick(s, 'address')}</li>}
          </ul>
          {(s.instagram || s.facebook) && (
            <div className="social-row">
              {s.instagram && <a className="soc ig" href={s.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramIcon size={20} /></a>}
              {s.facebook && <a className="soc fb" href={s.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookIcon size={20} /></a>}
            </div>
          )}
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">© {new Date().getFullYear()} Purepox. {t('footer_rights')}</div>
      </div>
    </footer>
  )
}
