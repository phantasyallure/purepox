import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { calculate, money } from '../lib/calc'
import { colorName, PRESETS } from '../lib/colors'
import { compressImage, kb } from '../lib/image'
import '../admin.css'

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

const STATUS = {
  new: { label: 'Nouvelle', color: '#ec6b14' },
  contacted: { label: 'Contactée', color: '#2563eb' },
  done: { label: 'Terminée', color: '#16a34a' },
  cancelled: { label: 'Annulée', color: '#8b8b93' },
}

const Icon = ({ d }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const ICONS = {
  orders: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  products: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  contact: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
}

/* ---------------- Login ---------------- */
function Login({ onDone }) {
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try { await api('/api/admin/login', { method: 'POST', body: { password } }); onDone() }
    catch (e2) { setErr(e2.status === 503 ? "Le mot de passe admin n'est pas configuré (ADMIN_PASSWORD)." : 'Mot de passe incorrect.') }
  }
  return (
    <div className="ad-login">
      <form onSubmit={submit} className="ad-card ad-login-card">
        <img src="/logo.jpg" alt="Purepox" />
        <h2>Administration</h2>
        <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
        {err && <div className="ad-error">{err}</div>}
        <button className="ad-btn primary">Connexion</button>
      </form>
    </div>
  )
}

/* ---------------- Orders ---------------- */
function Orders({ onCount, notify }) {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('new')
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    try { setOrders(await api('/api/admin/orders')) } catch { /* keep the previous list */ }
  }, [])

  // refresh every 20 s (and when the tab becomes visible again)
  useEffect(() => {
    load()
    const t = setInterval(() => { if (!document.hidden) load() }, 20000)
    const vis = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis) }
  }, [load])

  const newCount = orders.filter((o) => o.status === 'new').length
  useEffect(() => { onCount(newCount) }, [newCount, onCount])

  const setStatus = async (id, status) => {
    await api(`/api/admin/orders/${id}`, { method: 'PATCH', body: { status } })
    notify('Statut mis à jour'); load()
  }
  const del = async (id) => {
    if (!confirm('Supprimer cette commande ?')) return
    await api(`/api/admin/orders/${id}`, { method: 'DELETE' }); setOpen(null); load()
  }

  const shown = filter === 'new' ? orders.filter((o) => o.status === 'new') : orders
  const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((m, o) => m + (Number(o.total) || 0), 0)

  return (
    <>
      <div className="ad-stats">
        <div className="ad-stat hot"><span>Nouvelles</span><b>{newCount}</b></div>
        <div className="ad-stat"><span>Commandes</span><b>{orders.length}</b></div>
        <div className="ad-stat"><span>Total</span><b>{money(revenue)}</b><small>DA</small></div>
      </div>
      <div className="ad-pills">
        <button className={filter === 'new' ? 'on' : ''} onClick={() => setFilter('new')}>Nouvelles ({newCount})</button>
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Toutes ({orders.length})</button>
      </div>

      {shown.length === 0 && <div className="ad-empty"><b>📭</b>{filter === 'new' ? 'Aucune nouvelle commande.' : 'Aucune commande pour le moment.'}</div>}

      {shown.map((o) => {
        const st = STATUS[o.status] || STATUS.new
        const isOpen = open === o.id
        return (
          <div key={o.id} className={`ad-card ad-order ${isOpen ? 'open' : ''}`} style={{ '--c': st.color }}>
            <button className="ad-order-head" onClick={() => setOpen(isOpen ? null : o.id)}>
              <span className="ad-avatar">{(o.customer_name || '?').trim().charAt(0).toUpperCase()}</span>
              <div className="ad-order-who">
                <strong>{o.customer_name}</strong>
                <small>{new Date(o.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
              </div>
              <div className="ad-order-right">
                <b>{money(o.total)} DA</b>
                <span className="ad-tag" style={{ '--c': st.color }}>{st.label}</span>
              </div>
            </button>

            {isOpen && (
              <div className="ad-order-body">
                <a className="ad-btn primary block" href={`tel:${o.phone}`} dir="ltr">📞 {o.phone}</a>
                <ul className="ad-items">
                  {(o.items || []).map((i, k) => (
                    <li key={k}>
                      <span className="ad-dot" style={{ background: i.hex }} />
                      <div>
                        <strong>{i.product_fr}</strong>
                        <small>{i.color_fr} · {i.area_m2} m²</small>
                        <small>{i.kg} kg · {i.buckets} seau(x) × {i.bucket_kg} kg</small>
                      </div>
                      <b>{money(i.total)} DA</b>
                    </li>
                  ))}
                </ul>
                <div className="ad-label">Statut</div>
                <div className="ad-pills wrap">
                  {Object.entries(STATUS).map(([k, v]) => (
                    <button key={k} className={o.status === k ? 'on' : ''} style={{ '--c': v.color }} onClick={() => setStatus(o.id, k)}>{v.label}</button>
                  ))}
                </div>
                <button className="ad-link danger" onClick={() => del(o.id)}>Supprimer la commande</button>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

/* ---------------- Product editor ---------------- */
const blank = { name: '', desc: '', image_url: '', bucket_kg: 20, coverage_m2_per_kg: 0.5, active: true, colors: [] }

function ProductEditor({ initial, nextSort, onClose, onSaved }) {
  const [p, setP] = useState({
    ...blank, ...initial,
    name: initial?.name_fr || initial?.name_ar || '',
    desc: initial?.desc_fr || initial?.desc_ar || '',
    colors: (initial?.colors || []).map((c) => ({ ...c })),
  })
  const [busy, setBusy] = useState(false)
  const [up, setUp] = useState(false)
  const [picking, setPicking] = useState(false)
  const [info, setInfo] = useState('')
  const [err, setErr] = useState('')
  const [bad, setBad] = useState('')
  const nameRef = useRef(null)
  const colorsRef = useRef(null)
  const set = (k, v) => setP((o) => ({ ...o, [k]: v }))
  const lastPrice = p.colors.length ? p.colors[p.colors.length - 1].price : ''

  const addColor = (hex) => {
    const n = colorName(hex)
    setP((o) => ({ ...o, colors: [...o.colors, { hex, name_fr: n.fr, name_ar: n.ar, price: lastPrice ?? '', active: true }] }))
    setPicking(false)
  }
  // changing the swatch renames the colour by itself
  const recolor = (i, hex) => {
    const n = colorName(hex)
    setP((o) => ({ ...o, colors: o.colors.map((c, j) => (j === i ? { ...c, hex, name_fr: n.fr, name_ar: n.ar } : c)) }))
  }
  const setPrice = (i, v) => setP((o) => ({ ...o, colors: o.colors.map((c, j) => (j === i ? { ...c, price: v } : c)) }))
  const delColor = (i) => setP((o) => ({ ...o, colors: o.colors.filter((_, j) => j !== i) }))

  const example = useMemo(() => {
    const c = p.colors[0]
    return calculate({ bucket_kg: p.bucket_kg, coverage_m2_per_kg: p.coverage_m2_per_kg, base_price: c?.price || 0 }, { price: num(c?.price) }, 40)
  }, [p])

  const upload = async (file) => {
    if (!file) return
    setErr(''); setUp(true)
    try {
      const small = await compressImage(file)
      const fd = new FormData(); fd.append('file', small)
      const { url } = await api('/api/admin/upload', { method: 'POST', form: fd })
      set('image_url', url)
      setInfo(small === file ? '' : `Photo compressée : ${kb(file.size)} → ${kb(small.size)}`)
    } catch (e2) { setErr(e2.message === 'too_large' ? 'Image trop lourde (max 5 Mo).' : e2.message === 'no_storage' ? "Le stockage d'images n'est pas configuré." : "Impossible d'envoyer l'image.") }
    setUp(false)
  }

  const save = async (e) => {
    e.preventDefault()
    const fail = (field, ref, msg) => { setBad(field); setErr(msg); ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (field === 'name') ref.current?.focus() }
    if (!p.name.trim()) return fail('name', nameRef, '👆 Écrivez d\'abord le nom du produit.')
    if (!p.colors.length) return fail('colors', colorsRef, '👆 Ajoutez au moins une couleur avec son prix.')
    if (p.colors.some((c) => c.price === '' || c.price == null)) return fail('colors', colorsRef, '👆 Entrez le prix de chaque couleur.')
    setBusy(true); setErr(''); setBad('')
    try {
      await api('/api/admin/products', {
        method: 'POST',
        body: {
          id: p.id, name: p.name, desc: p.desc,
          image_url: p.image_url || null, bucket_kg: p.bucket_kg, coverage_m2_per_kg: p.coverage_m2_per_kg,
          sort_order: p.sort_order ?? nextSort, active: p.active,
          colors: p.colors.map((c) => ({ id: c.id, name_fr: c.name_fr, name_ar: c.name_ar, hex: c.hex, price: c.price })),
        },
      })
      onSaved()
    } catch (e2) {
      setErr(e2.status === 401 ? 'Session expirée. Reconnectez-vous.' : `Erreur d'enregistrement (${e2.message}). Réessayez.`)
      setBusy(false)
    }
  }

  return (
    <form className="ad-sheet" onSubmit={save}>
      <div className="ad-sheet-top">
        <button type="button" className="ad-link" onClick={onClose}>← Retour</button>
        <strong>{p.id ? 'Modifier le produit' : 'Nouveau produit'}</strong>
        <span />
      </div>

      <div className="ad-sheet-body">
        <div className="ad-col">
        <label className={`ad-drop ${p.image_url ? 'has' : ''}`}>
          {p.image_url ? <img src={p.image_url} alt="" /> : <span className="ad-drop-in"><b>📷</b>{up ? 'Envoi…' : 'Ajouter une photo'}<small>optionnel</small></span>}
          {p.image_url && <span className="ad-drop-chg">{up ? 'Envoi…' : 'Changer la photo'}</span>}
          <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {info && <div className="ad-auto ok">✅ {info}</div>}
        {p.image_url && <button type="button" className="ad-link danger" onClick={() => { set('image_url', ''); setInfo('') }}>Retirer la photo</button>}

        <section className="ad-card">
          <h3>Nom du produit <em className="req">obligatoire</em></h3>
          <input ref={nameRef} className={`ad-big ${bad === 'name' ? 'bad' : ''}`} placeholder="Ex : Époxy sol brillant" value={p.name} onChange={(e) => { set('name', e.target.value); setBad('') }} />
          <h3 className="sub">Description <small>(optionnel)</small></h3>
          <textarea rows="4" placeholder="Décrivez le produit en quelques mots" value={p.desc} onChange={(e) => set('desc', e.target.value)} />
          <div className="ad-auto">🌐 Écrivez en français ou en arabe : la traduction est automatique.</div>
        </section>
        </div>

        <div className="ad-col">
        <section className="ad-card">
          <h3>Seau et rendement</h3>
          <div className="ad-two">
            <div className="ad-field">
              <label>Un seau contient</label>
              <div className="ad-suffix"><input type="number" step="any" min="0" inputMode="decimal" value={p.bucket_kg} onChange={(e) => set('bucket_kg', e.target.value)} required /><span>kg</span></div>
            </div>
            <div className="ad-field">
              <label>1 kg couvre</label>
              <div className="ad-suffix"><input type="number" step="any" min="0" inputMode="decimal" value={p.coverage_m2_per_kg} onChange={(e) => set('coverage_m2_per_kg', e.target.value)} required /><span>m²</span></div>
            </div>
          </div>
          {example && (
            <div className="ad-example">
              Exemple : <b>40 m²</b> → <b>{example.kg} kg</b> → <b>{example.buckets} seau(x)</b>{example.total ? <> → <b>{money(example.total)} DA</b></> : null}
            </div>
          )}
        </section>

        <section className={`ad-card ${bad === 'colors' ? 'bad' : ''}`} ref={colorsRef}>
          <h3>Couleurs et prix <small>(prix d'un seau)</small></h3>
          {p.colors.map((c, i) => (
            <div className="ad-color" key={c.id || i}>
              <label className="ad-swatch" style={{ background: c.hex }} title="Changer la couleur">
                <input type="color" value={c.hex} onChange={(e) => recolor(i, e.target.value)} />
              </label>
              <div className="ad-cname"><strong>{c.name_fr}</strong><small className="ar">{c.name_ar}</small></div>
              <div className="ad-suffix price"><input className={bad === 'colors' && (c.price === '' || c.price == null) ? 'bad' : ''} type="number" step="any" min="0" inputMode="decimal" placeholder="Prix" value={c.price ?? ''} onChange={(e) => setPrice(i, e.target.value)} /><span>DA</span></div>
              <button type="button" className="ad-x" onClick={() => delColor(i)} aria-label="Retirer">×</button>
            </div>
          ))}

          {picking ? (
            <div className="ad-palette">
              <div className="ad-palette-grid">
                {PRESETS.map(([fr, ar, hex]) => (
                  <button type="button" key={hex} onClick={() => addColor(hex)}>
                    <i style={{ background: hex }} /><span>{fr}</span>
                  </button>
                ))}
                <label className="custom">
                  <i className="rainbow" /><span>Autre…</span>
                  <input type="color" defaultValue="#cccccc" onChange={(e) => addColor(e.target.value)} />
                </label>
              </div>
              <button type="button" className="ad-link" onClick={() => setPicking(false)}>Annuler</button>
            </div>
          ) : (
            <button type="button" className="ad-btn ghost block" onClick={() => setPicking(true)}>+ Ajouter une couleur</button>
          )}
          <div className="ad-auto">🎨 Le nom de la couleur est trouvé automatiquement.</div>
        </section>

        <label className="ad-switch ad-card row">
          <input type="checkbox" checked={p.active} onChange={(e) => set('active', e.target.checked)} />
          <span>Visible sur le site</span>
        </label>
        </div>
        {err && <div className="ad-error full">{err}</div>}
      </div>

      <div className="ad-savebar">
        <button className="ad-btn primary block" disabled={busy || up}>{busy ? 'Enregistrement et traduction…' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}

function Products({ notify }) {
  const [list, setList] = useState([])
  const [edit, setEdit] = useState(null)
  const load = useCallback(() => api('/api/admin/products').then(setList).catch(() => {}), [])
  useEffect(() => { load() }, [load])
  const nextSort = (list.reduce((m, p) => Math.max(m, p.sort_order || 0), 0)) + 1

  const del = async (p) => {
    if (!confirm(`Supprimer « ${p.name_fr} » ?`)) return
    await api(`/api/admin/products/${p.id}`, { method: 'DELETE' }); notify('Produit supprimé'); load()
  }

  if (edit) {
    return <ProductEditor initial={edit} nextSort={nextSort} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); notify('Enregistré ✓'); load() }} />
  }

  return (
    <>
      <div className="ad-pgrid">
        <button className="ad-addcard" onClick={() => setEdit({})}><b>+</b>Nouveau produit</button>
        {list.map((p) => (
          <div key={p.id} className="ad-card ad-product">
            <div className="ad-pimg" onClick={() => setEdit(p)}>
              {p.image_url ? <img src={p.image_url} alt="" /> : '🪣'}
              {!p.active && <span className="ad-tag" style={{ '--c': '#8b8b93' }}>Masqué</span>}
            </div>
            <button className="ad-product-main" onClick={() => setEdit(p)}>
              <div className="ad-product-info">
                <strong>{p.name_fr || p.name_ar}</strong>
                <small>{p.bucket_kg} kg / seau · {p.coverage_m2_per_kg} m² par kg</small>
                <div className="ad-sw">{p.colors.map((c) => <i key={c.id} style={{ background: c.hex }} />)}<small>{p.colors.length} couleur(s)</small></div>
              </div>
            </button>
            <div className="ad-pfoot">
              <button className="ad-link" onClick={() => setEdit(p)}>Modifier</button>
              <button className="ad-link danger" onClick={() => del(p)}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------------- Contact ---------------- */
function ContactForm({ notify }) {
  const [s, setS] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api('/api/admin/settings').then((d) => setS({ ...d, address: d.address_fr || d.address_ar || '', hours: d.hours_fr || d.hours_ar || '' })).catch(() => {})
  }, [])
  if (!s) return null
  const f = (k, label, dir, ph, type) => (
    <div className="ad-field"><label>{label}</label>
      <input type={type || 'text'} dir={dir} placeholder={ph} value={s[k] || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>
  )
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await api('/api/admin/settings', { method: 'PUT', body: s }); notify('Enregistré ✓') }
    catch { notify("Erreur d'enregistrement") }
    setBusy(false)
  }
  return (
    <form onSubmit={save} className="ad-contact">
      <section className="ad-card"><h3>📞 Téléphone</h3>
        {f('phone', 'Numéro principal', 'ltr', '0X XX XX XX XX', 'tel')}{f('phone2', 'Numéro 2 (optionnel)', 'ltr', '', 'tel')}
      </section>
      <section className="ad-card"><h3>💬 WhatsApp</h3>
        {f('whatsapp', 'Numéro WhatsApp', 'ltr', '+213 792 27 31 00', 'tel')}
        <div className="ad-auto">Laissez vide pour utiliser +213 792 27 31 00. Le bouton vert du site ouvre directement ce numéro.</div>
      </section>
      <section className="ad-card"><h3>🌐 En ligne</h3>
        {f('email', 'Email', 'ltr', '', 'email')}{f('facebook', 'Lien Facebook', 'ltr', 'https://')}{f('instagram', 'Lien Instagram', 'ltr', 'https://')}
      </section>
      <section className="ad-card"><h3>📍 Adresse et horaires</h3>
        {f('address', 'Adresse', undefined, 'Ex : Oran, Algérie')}
        {f('hours', 'Horaires', undefined, 'Ex : Sam – Jeu : 08h – 17h')}
        <div className="ad-auto">🌐 Écrivez en français ou en arabe : la traduction est automatique.</div>
      </section>
      <div className="ad-savebar static"><button className="ad-btn primary block" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    </form>
  )
}

/* ---------------- Shell ---------------- */
export default function Admin() {
  const [authed, setAuthed] = useState(undefined) // undefined = checking, false = login, true = in, 'noapi' = no backend
  const [tab, setTab] = useState('orders')
  const [count, setCount] = useState(0)
  const [toast, setToast] = useState('')

  const notify = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 2200) }, [])

  useEffect(() => {
    api('/api/admin/session').then(() => setAuthed(true)).catch((e) => setAuthed(e.status === 401 ? false : 'noapi'))
    const out = () => setAuthed(false)
    window.addEventListener('pp-unauth', out)
    return () => window.removeEventListener('pp-unauth', out)
  }, [])

  const logout = async () => { try { await api('/api/admin/logout', { method: 'POST' }) } catch { /* ignore */ } setAuthed(false) }

  if (authed === 'noapi') {
    return (
      <div className="ad-login"><div className="ad-card ad-login-card">
        <h2>Administration</h2>
        <p>Le serveur (Cloudflare Functions + D1) n'est pas disponible ici. Voir le README.</p>
        <Link to="/" className="ad-btn ghost">← Site</Link>
      </div></div>
    )
  }
  if (authed === undefined) return <div className="ad-login"><p>…</p></div>
  if (!authed) return <Login onDone={() => setAuthed(true)} />

  const tabs = [['orders', 'Commandes', ICONS.orders], ['products', 'Produits', ICONS.products], ['contact', 'Contact', ICONS.contact]]

  return (
    <div className="ad">
      <header className="ad-top">
        <div className="ad-top-in">
          <img src="/logo.jpg" alt="Purepox" />
          <div className="ad-top-actions">
            <Link to="/" className="ad-link">Voir le site</Link>
            <button className="ad-link" onClick={logout}>Quitter</button>
          </div>
        </div>
      </header>

      <main className="ad-main">
        <div className="ad-head"><div><h1>{tabs.find((t) => t[0] === tab)[1]}</h1><p>{{ orders: 'Les commandes de vos clients', products: 'Votre catalogue : photo, prix et couleurs', contact: 'Coordonnées affichées sur le site' }[tab]}</p></div></div>
        {tab === 'orders' && <Orders onCount={setCount} notify={notify} />}
        {tab === 'products' && <Products notify={notify} />}
        {tab === 'contact' && <ContactForm notify={notify} />}
      </main>

      <nav className="ad-nav">
        <div className="ad-brand"><img src="/logo.jpg" alt="Purepox" /></div>
        {tabs.map(([k, label, d]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <Icon d={d} />
            <span>{label}</span>
            {k === 'orders' && count > 0 && <em>{count}</em>}
          </button>
        ))}
        <div className="ad-side-foot">
          <Link to="/" className="ad-link">↗ Voir le site</Link>
          <button className="ad-link" onClick={logout}>⎋ Quitter</button>
        </div>
      </nav>

      {toast && <div className="ad-toast">{toast}</div>}
    </div>
  )
}
