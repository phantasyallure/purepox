import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { calculate, money } from '../lib/calc'
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

  return (
    <>
      <div className="ad-pills">
        <button className={filter === 'new' ? 'on' : ''} onClick={() => setFilter('new')}>Nouvelles ({newCount})</button>
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Toutes ({orders.length})</button>
      </div>

      {shown.length === 0 && <p className="ad-empty">{filter === 'new' ? 'Aucune nouvelle commande.' : 'Aucune commande pour le moment.'}</p>}

      {shown.map((o) => {
        const st = STATUS[o.status] || STATUS.new
        const isOpen = open === o.id
        return (
          <div key={o.id} className={`ad-card ad-order ${isOpen ? 'open' : ''}`}>
            <button className="ad-order-head" onClick={() => setOpen(isOpen ? null : o.id)}>
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
const blank = { name_fr: '', name_ar: '', desc_fr: '', desc_ar: '', image_url: '', bucket_kg: 20, coverage_m2_per_kg: 0.5, active: true, colors: [] }

function ProductEditor({ initial, nextSort, onClose, onSaved }) {
  const [p, setP] = useState({ ...blank, ...initial, colors: (initial?.colors || []).map((c) => ({ ...c })) })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setP((o) => ({ ...o, [k]: v }))
  const setColor = (i, k, v) => setP((o) => ({ ...o, colors: o.colors.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }))
  const addColor = () => setP((o) => {
    const last = o.colors[o.colors.length - 1]
    return { ...o, colors: [...o.colors, { name_fr: '', name_ar: '', hex: '#cccccc', price: last?.price ?? '', active: true }] }
  })
  const delColor = (i) => {
    setP((o) => ({ ...o, colors: o.colors.filter((_, j) => j !== i) }))
  }

  const example = useMemo(() => {
    const c = p.colors[0]
    return calculate(
      { bucket_kg: p.bucket_kg, coverage_m2_per_kg: p.coverage_m2_per_kg, base_price: c?.price || 0 },
      { price: num(c?.price) }, 40)
  }, [p])

  const upload = async (file) => {
    if (!file) return
    try {
      const fd = new FormData(); fd.append('file', file)
      const { url } = await api('/api/admin/upload', { method: 'POST', form: fd })
      set('image_url', url)
    } catch (e2) { setErr(e2.message === 'too_large' ? 'Image trop lourde (max 5 Mo).' : "Impossible d'envoyer l'image.") }
  }

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      await api('/api/admin/products', {
        method: 'POST',
        body: {
          id: p.id, name_fr: p.name_fr, name_ar: p.name_ar, desc_fr: p.desc_fr, desc_ar: p.desc_ar,
          image_url: p.image_url || null, bucket_kg: p.bucket_kg, coverage_m2_per_kg: p.coverage_m2_per_kg,
          sort_order: p.sort_order ?? nextSort, active: p.active,
          colors: p.colors.map((c) => ({ id: c.id, name_fr: c.name_fr, name_ar: c.name_ar, hex: c.hex, price: c.price })),
        },
      })
      onSaved()
    } catch (e2) { setErr("Erreur d'enregistrement. Vérifiez les champs."); setBusy(false) }
  }

  return (
    <form className="ad-sheet" onSubmit={save}>
      <div className="ad-sheet-top">
        <button type="button" className="ad-link" onClick={onClose}>← Retour</button>
        <strong>{p.id ? 'Modifier le produit' : 'Nouveau produit'}</strong>
        <span />
      </div>

      <div className="ad-sheet-body">
        <section className="ad-card">
          <h3><i>1</i> Nom du produit</h3>
          <input placeholder="Nom en français" value={p.name_fr} onChange={(e) => set('name_fr', e.target.value)} required />
          <input dir="rtl" placeholder="الاسم بالعربية" value={p.name_ar} onChange={(e) => set('name_ar', e.target.value)} />
        </section>

        <section className="ad-card">
          <h3><i>2</i> Seau et rendement</h3>
          <div className="ad-field">
            <label>Un seau contient</label>
            <div className="ad-suffix"><input type="number" step="any" min="0" inputMode="decimal" value={p.bucket_kg} onChange={(e) => set('bucket_kg', e.target.value)} required /><span>kg</span></div>
          </div>
          <div className="ad-field">
            <label>1 kg couvre</label>
            <div className="ad-suffix"><input type="number" step="any" min="0" inputMode="decimal" value={p.coverage_m2_per_kg} onChange={(e) => set('coverage_m2_per_kg', e.target.value)} required /><span>m²</span></div>
          </div>
          {example && (
            <div className="ad-example">
              Exemple : <b>40 m²</b> → <b>{example.kg} kg</b> → <b>{example.buckets} seau(x)</b>{example.total ? <> → <b>{money(example.total)} DA</b></> : null}
            </div>
          )}
        </section>

        <section className="ad-card">
          <h3><i>3</i> Couleurs et prix <small>(prix d'un seau)</small></h3>
          {p.colors.map((c, i) => (
            <div className="ad-color" key={c.id || i}>
              <input type="color" value={c.hex} onChange={(e) => setColor(i, 'hex', e.target.value)} aria-label="Couleur" />
              <input className="n" placeholder="Nom (FR)" value={c.name_fr} onChange={(e) => setColor(i, 'name_fr', e.target.value)} required />
              <button type="button" className="ad-x" onClick={() => delColor(i)} aria-label="Retirer">×</button>
              <div className="ad-suffix price"><input type="number" step="any" min="0" inputMode="decimal" placeholder="Prix" value={c.price ?? ''} onChange={(e) => setColor(i, 'price', e.target.value)} required /><span>DA</span></div>
              <input dir="rtl" className="ar" placeholder="الاسم" value={c.name_ar} onChange={(e) => setColor(i, 'name_ar', e.target.value)} />
            </div>
          ))}
          <button type="button" className="ad-btn ghost block" onClick={addColor}>+ Ajouter une couleur</button>
        </section>

        <section className="ad-card">
          <h3><i>4</i> Description <small>(optionnel)</small></h3>
          <textarea rows="3" placeholder="Description en français" value={p.desc_fr} onChange={(e) => set('desc_fr', e.target.value)} />
          <textarea dir="rtl" rows="3" placeholder="الوصف بالعربية" value={p.desc_ar} onChange={(e) => set('desc_ar', e.target.value)} />
          <div className="ad-photo">
            {p.image_url && <img src={p.image_url} alt="" />}
            <label className="ad-btn ghost">{p.image_url ? 'Changer la photo' : 'Ajouter une photo'}
              <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {p.image_url && <button type="button" className="ad-link danger" onClick={() => set('image_url', '')}>Retirer</button>}
          </div>
          <label className="ad-switch">
            <input type="checkbox" checked={p.active} onChange={(e) => set('active', e.target.checked)} />
            <span>Visible sur le site</span>
          </label>
        </section>
        {err && <div className="ad-error">{err}</div>}
      </div>

      <div className="ad-savebar">
        <button className="ad-btn primary block" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
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
      <button className="ad-btn primary block" onClick={() => setEdit({})}>+ Nouveau produit</button>
      {list.map((p) => (
        <div key={p.id} className="ad-card ad-product">
          <button className="ad-product-main" onClick={() => setEdit(p)}>
            <div className="ad-product-info">
              <strong>{p.name_fr}</strong>
              <small>{p.bucket_kg} kg / seau · {p.coverage_m2_per_kg} m² par kg</small>
              <div className="ad-sw">{p.colors.map((c) => <i key={c.id} style={{ background: c.hex }} />)}<small>{p.colors.length} couleur(s)</small></div>
            </div>
            <span className="ad-chev">›</span>
          </button>
          {!p.active && <span className="ad-tag" style={{ '--c': '#8b8b93' }}>Masqué</span>}
          <button className="ad-link danger" onClick={() => del(p)}>Supprimer</button>
        </div>
      ))}
    </>
  )
}

/* ---------------- Contact ---------------- */
function ContactForm({ notify }) {
  const [s, setS] = useState(null)
  useEffect(() => { api('/api/admin/settings').then(setS).catch(() => {}) }, [])
  if (!s) return null
  const f = (k, label, dir, ph) => (
    <div className="ad-field"><label>{label}</label>
      <input dir={dir} placeholder={ph} value={s[k] || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>
  )
  const save = async (e) => {
    e.preventDefault()
    try { await api('/api/admin/settings', { method: 'PUT', body: s }); notify('Enregistré ✓') }
    catch { notify("Erreur d'enregistrement") }
  }
  return (
    <form onSubmit={save}>
      <section className="ad-card"><h3>Téléphone</h3>
        {f('phone', 'Numéro principal', 'ltr')}{f('phone2', 'Numéro 2 (optionnel)', 'ltr')}
      </section>
      <section className="ad-card"><h3>En ligne</h3>
        {f('email', 'Email')}{f('facebook', 'Lien Facebook', 'ltr', 'https://')}{f('instagram', 'Lien Instagram', 'ltr', 'https://')}
      </section>
      <section className="ad-card"><h3>Adresse et horaires</h3>
        {f('address_fr', 'Adresse (FR)')}{f('address_ar', 'العنوان (AR)', 'rtl')}
        {f('hours_fr', 'Horaires (FR)')}{f('hours_ar', 'أوقات العمل (AR)', 'rtl')}
      </section>
      <div className="ad-savebar static"><button className="ad-btn primary block">Enregistrer</button></div>
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
        <h1>{tabs.find((t) => t[0] === tab)[1]}</h1>
        {tab === 'orders' && <Orders onCount={setCount} notify={notify} />}
        {tab === 'products' && <Products notify={notify} />}
        {tab === 'contact' && <ContactForm notify={notify} />}
      </main>

      <nav className="ad-nav">
        {tabs.map(([k, label, d]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <Icon d={d} />
            <span>{label}</span>
            {k === 'orders' && count > 0 && <em>{count}</em>}
          </button>
        ))}
      </nav>

      {toast && <div className="ad-toast">{toast}</div>}
    </div>
  )
}
