import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { calcMix, effPrice, money, packsText } from '../lib/calc'
import { colorName, PRESETS } from '../lib/colors'
import { compressImage, kb } from '../lib/image'
import { waDigits } from '../lib/whatsapp'
import '../admin.css'

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

const STATUS = {
  new: { label: 'Nouvelle', color: '#c9971c' },
  contacted: { label: 'Contactée', color: '#2563eb' },
  done: { label: 'Terminée', color: '#16a34a' },
  cancelled: { label: 'Annulée', color: '#8b8b93' },
}

const Icon = ({ d }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const ICONS = {
  orders: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  calc: 'M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8',
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
        <img src="/logo.png" alt="DECO DZ" />
        <h2>Administration</h2>
        <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
        {err && <div className="ad-error">{err}</div>}
        <button className="ad-btn primary">Connexion</button>
      </form>
    </div>
  )
}

/* ---------------- Orders (receipts) ---------------- */
const FAM = { epoxy: 'Époxy', polyurethane: 'Polyuréthane' }
const SUP = { concrete: 'Béton', smooth: 'Surface lisse' }
const LOC = { interior: 'Intérieur', exterior: 'Extérieur' }
const THK = { lt1: 'Filmogène', gt1: 'Autolissant' }
const TOOL = { roller: 'Rouleau', squeegee: 'Raclette' }

const packText = (i) => (i.packs ? i.packs.map((p) => (p.kg ? `${p.n} × ${p.kg} kg` : `Qté : ${p.n}`)).join(' + ') : `${i.buckets} seau(x) × ${i.bucket_kg} kg`)

function RLine({ i }) {
  return (
    <li className="ad-rl">
      {i.image_url ? <img src={i.image_url} alt="" /> : <span className="ad-rl-dot" style={{ background: i.hex || '#e4e4e8' }} />}
      <div>
        <strong>{i.product_fr}{i.role === 'primer' && <em className="ad-role">Primaire</em>}{i.role === 'finition' && i.kind === 'calc' && <em className="ad-role fin">Finition</em>}</strong>
        {i.color_fr && <small><i className="ad-mini" style={{ background: i.hex }} /> {i.color_fr}{i.on_demand ? ' · couleur demandée par le client' : i.price_tier === 'wholesale' ? ' · prix de gros' : ''}</small>}
        <small>{packText(i)}{i.kg ? ` (${i.kg} kg)` : ''}{i.area_m2 && i.kind !== 'calc' ? ` · ${i.area_m2} m²` : ''}</small>
        {!i.kind && i.surface && <small>{SUP[i.surface]} · {LOC[i.location]} · {THK[i.thickness]}</small>}
      </div>
      {i.on_demand ? <b className="ad-od">Sur demande</b> : <b>{money(i.total)} DA</b>}
    </li>
  )
}

function Receipt({ o }) {
  const calcs = o.meta?.calcs || []
  const groups = []
  const loose = []
  for (const i of o.items || []) {
    if (i.kind === 'calc') (groups[i.group] ||= { calc: calcs[i.group], items: [] }).items.push(i)
    else loose.push(i)
  }
  return (
    <div className="ad-rc">
      {groups.filter(Boolean).map((g, k) => (
        <div className="ad-rgroup" key={k}>
          {g.calc && (
            <div className="ad-rhead">
              <span>{FAM[g.calc.family]}</span>{g.calc.support && <span>{SUP[g.calc.support]}</span>}<span>{LOC[g.calc.location]}</span><span>{THK[g.calc.thickness]}</span><span>{g.calc.area} m²</span>
            </div>
          )}
          <ul className="ad-rlines">{g.items.map((i, j) => <RLine key={j} i={i} />)}</ul>
          {g.calc && <div className="ad-rfacts"><span>🖌️ Outil : <b>{TOOL[g.calc.tool]}</b></span>{g.calc.layers && <span>🧱 <b>{g.calc.layers} couches</b></span>}{g.calc.catalog && <a href={g.calc.catalog} target="_blank" rel="noreferrer">📄 Catalogue</a>}</div>}
        </div>
      ))}
      {loose.length > 0 && <ul className="ad-rlines">{loose.map((i, j) => <RLine key={j} i={i} />)}</ul>}
      <div className="ad-rtotal"><span>Total</span><b>{money(o.total)} DA</b></div>
    </div>
  )
}

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
        const place = [o.wilaya, o.commune].filter(Boolean).join(' · ')
        const wa = `https://wa.me/${waDigits(o.phone)}?text=${encodeURIComponent(`Bonjour ${o.customer_name}, ici DECO DZ. Concernant votre commande ${o.ref} (${money(o.total)} DA).`)}`
        return (
          <div key={o.id} className={`ad-card ad-order ${isOpen ? 'open' : ''}`} style={{ '--c': st.color }}>
            <button className="ad-order-head" onClick={() => setOpen(isOpen ? null : o.id)}>
              <span className="ad-avatar">{(o.customer_name || '?').trim().charAt(0).toUpperCase()}</span>
              <div className="ad-order-who">
                <strong>{o.customer_name}</strong>
                <small>{new Date(o.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}{place ? ` · ${place}` : ''}</small>
              </div>
              <div className="ad-order-right">
                <b>{money(o.total)} DA</b>
                <span className="ad-tag" style={{ '--c': st.color }}>{st.label}</span>
                {(o.items || []).some((i) => i.on_demand) && <span className="ad-tag" style={{ '--c': '#7c3aed' }}>🎨 Couleur à confirmer</span>}
              </div>
            </button>

            {isOpen && (
              <div className="ad-order-body">
                <div className="ad-contact-row">
                  <a className="ad-btn primary" href={`tel:${o.phone}`} dir="ltr">📞 Appeler {o.phone}</a>
                  <a className="ad-btn wa" href={wa} target="_blank" rel="noreferrer">💬 WhatsApp</a>
                </div>
                <div className="ad-where"><span>📍 Livraison</span><b>{place || '—'}</b><span className="ad-ref">Réf. {o.ref}</span></div>
                <Receipt o={o} />
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

/* ---------------- shared editor parts ---------------- */
function Seg({ value, options, onChange }) {
  return (
    <div className="ad-seg">
      {options.map(([v, label]) => (
        <button type="button" key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  )
}

function PhotoField({ value, onChange, onBusy, hint }) {
  const [up, setUp] = useState(false)
  const [info, setInfo] = useState('')
  const [err, setErr] = useState('')
  const upload = async (file) => {
    if (!file) return
    setErr(''); setUp(true); onBusy?.(true)
    try {
      const small = await compressImage(file)
      const fd = new FormData(); fd.append('file', small)
      const { url } = await api('/api/admin/upload', { method: 'POST', form: fd })
      onChange(url)
      setInfo(small === file ? '' : `Photo compressée : ${kb(file.size)} → ${kb(small.size)}`)
    } catch (e2) { setErr(e2.message === 'too_large' ? 'Image trop lourde (max 5 Mo).' : e2.message === 'no_storage' ? "Le stockage d'images n'est pas configuré." : "Impossible d'envoyer l'image.") }
    setUp(false); onBusy?.(false)
  }
  return (
    <>
      <label className={`ad-drop ${value ? 'has' : ''}`}>
        {value ? <img src={value} alt="" /> : <span className="ad-drop-in"><b>📷</b>{up ? 'Envoi…' : 'Ajouter une photo'}<small>{hint || 'optionnel'}</small></span>}
        {value && <span className="ad-drop-chg">{up ? 'Envoi…' : 'Changer la photo'}</span>}
        <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      {info && <div className="ad-auto ok">✅ {info}</div>}
      {err && <div className="ad-error">{err}</div>}
      {value && <button type="button" className="ad-link danger" onClick={() => { onChange(''); setInfo('') }}>Retirer la photo</button>}
    </>
  )
}

// colours with their price. advanced = also the small-bucket price and the wholesale price (calculator)
function ColorsEditor({ colors, onChange, max, advanced, bad, bucketKg, smallKg, optionalPrice, defaultPrice, what = 'du seau ci-dessus' }) {
  const [picking, setPicking] = useState(false)
  const lastPrice = optionalPrice ? '' : colors.length ? colors[colors.length - 1].price : ''
  const patch = (i, o) => onChange(colors.map((c, j) => (j === i ? { ...c, ...o } : c)))
  const add = (hex) => {
    if (colors.length >= max) return
    const n = colorName(hex)
    onChange([...colors, { hex, name_fr: n.fr, name_ar: n.ar, price: lastPrice ?? '', price_small: '', price_wholesale: '', active: true }])
    setPicking(false)
  }
  return (
    <>
      {(advanced || (optionalPrice && colors.length > 0)) && (
        <div className="ad-hint">
          {optionalPrice
            ? <>Laissez vide pour utiliser le prix {what}{Number(defaultPrice) > 0 ? ` (${Number(defaultPrice).toLocaleString('fr-FR')} DA)` : ''}. Remplissez seulement si cette couleur a un prix différent.</>
            : <><b>Seau {bucketKg} kg</b> = prix obligatoire · <b>Seau {smallKg || '—'} kg</b> = si vide, calculé automatiquement · <b>Gros</b> = prix du grand seau à partir de 200 m² (facultatif)</>}
        </div>
      )}
      {colors.map((c, i) => (
        <div className={`ad-color ${advanced ? 'adv' : ''}`} key={c.id || i}>
          <label className="ad-swatch" style={{ background: c.hex }} title="Changer la couleur">
            <input type="color" value={c.hex} onChange={(e) => { const n = colorName(e.target.value); patch(i, { hex: e.target.value, name_fr: n.fr, name_ar: n.ar }) }} />
          </label>
          <div className="ad-cname"><strong>{c.name_fr}</strong><small className="ar">{c.name_ar}</small></div>
          <div className="ad-suffix price"><input className={bad && !optionalPrice && (c.price === '' || c.price == null) ? 'bad' : ''} type="number" step="any" min="0" inputMode="decimal" placeholder={optionalPrice ? (Number(defaultPrice) > 0 ? `${defaultPrice} (par défaut)` : bucketKg ? `Seau ${bucketKg} kg` : 'Prix') : advanced ? `Seau ${bucketKg} kg` : 'Prix'} value={c.price ?? ''} onChange={(e) => patch(i, { price: e.target.value })} /><span>DA</span></div>
          {advanced && smallKg > 0 && <div className="ad-suffix price"><input type="number" step="any" min="0" inputMode="decimal" placeholder={`Seau ${smallKg} kg`} value={c.price_small ?? ''} onChange={(e) => patch(i, { price_small: e.target.value })} /><span>DA</span></div>}
          {advanced && <div className="ad-suffix price ws"><input type="number" step="any" min="0" inputMode="decimal" placeholder="Gros" value={c.price_wholesale ?? ''} onChange={(e) => patch(i, { price_wholesale: e.target.value })} /><span>DA</span></div>}
          <button type="button" className="ad-x" onClick={() => onChange(colors.filter((_, j) => j !== i))} aria-label="Retirer">×</button>
        </div>
      ))}
      {picking ? (
        <div className="ad-palette">
          <div className="ad-palette-grid">
            {PRESETS.map(([fr, , hex]) => (
              <button type="button" key={hex} onClick={() => add(hex)}><i style={{ background: hex }} /><span>{fr}</span></button>
            ))}
            <label className="custom">
              <i className="rainbow" /><span>Autre…</span>
              <input type="color" defaultValue="#cccccc" onChange={(e) => add(e.target.value)} />
            </label>
          </div>
          <button type="button" className="ad-link" onClick={() => setPicking(false)}>Annuler</button>
        </div>
      ) : (
        colors.length >= max
          ? <div className="ad-auto">Maximum {max} couleurs.</div>
          : <button type="button" className="ad-btn ghost block" onClick={() => setPicking(true)}>+ Ajouter une couleur</button>
      )}
      {colors.length > 0 && <div className="ad-auto">🎨 Le nom de la couleur est trouvé automatiquement.</div>}
    </>
  )
}

/* ---------------- Normal product: name, photo, description, colours + prices ---------------- */
const blank = { name: '', price: '', desc: '', image_url: '', active: true, colors: [] }
const MAX_COLORS = 12

function ProductEditor({ initial, nextSort, onClose, onSaved }) {
  const [p, setP] = useState({
    ...blank, ...initial,
    name: initial?.name_fr || initial?.name_ar || '',
    desc: initial?.desc_fr || initial?.desc_ar || '',
    price: initial?.base_price > 0 ? initial.base_price : '',
    colors: (initial?.colors || []).map((c) => ({ ...c })),
  })
  const [busy, setBusy] = useState(false)
  const [up, setUp] = useState(false)
  const [err, setErr] = useState('')
  const [bad, setBad] = useState('')
  const nameRef = useRef(null)
  const priceRef = useRef(null)
  const set = (k, v) => setP((o) => ({ ...o, [k]: v }))

  const save = async (e) => {
    e.preventDefault()
    const fail = (field, ref, msg) => { setBad(field); setErr(msg); ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); ref.current?.focus?.() }
    if (!p.name.trim()) return fail('name', nameRef, '👆 Écrivez d\'abord le nom du produit.')
    if (!(Number(p.price) > 0)) return fail('price', priceRef, '👆 Entrez le prix du produit.')
    setBusy(true); setErr(''); setBad('')
    try {
      await api('/api/admin/products', {
        method: 'POST',
        body: {
          id: p.id, name: p.name, price: p.price, desc: p.desc, image_url: p.image_url || null,
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
      <div className="ad-sheet-body" style={{ gridTemplateColumns: '1fr', width: 'min(640px, 100%)' }}>
        <div className="ad-col">
          <PhotoField value={p.image_url} onChange={(v) => set('image_url', v)} onBusy={setUp} />
          <section className="ad-card" style={{ display: 'grid', gap: 16 }}>
            <div className="ad-field">
              <label>Nom du produit</label>
              <input ref={nameRef} className={`ad-big ${bad === 'name' ? 'bad' : ''}`} placeholder="Ex : Pinceau 50 mm" value={p.name} onChange={(e) => { set('name', e.target.value); setBad('') }} />
            </div>
            <div className="ad-field">
              <label>Prix</label>
              <div className="ad-suffix"><input ref={priceRef} className={`ad-big ${bad === 'price' ? 'bad' : ''}`} type="number" step="any" min="0" inputMode="decimal" placeholder="Ex : 3500" value={p.price} onChange={(e) => { set('price', e.target.value); setBad('') }} /><span>DA</span></div>
            </div>
            <div className="ad-field">
              <label>Description <small style={{ fontWeight: 400 }}>(optionnel)</small></label>
              <textarea rows="3" placeholder="Quelques mots sur le produit" value={p.desc} onChange={(e) => set('desc', e.target.value)} />
            </div>
          </section>
          <section className="ad-card" style={{ display: 'grid', gap: 12 }}>
            <div className="ad-field">
              <label>Couleurs <small style={{ fontWeight: 400 }}>(optionnel — laissez vide s'il n'y en a pas)</small></label>
            </div>
            <ColorsEditor optionalPrice what="du produit" defaultPrice={p.price} colors={p.colors} onChange={(c) => set('colors', c)} max={MAX_COLORS} />
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
              <small>{Number(p.base_price) > 0 ? `${money(p.base_price)} DA` : 'Prix à entrer'}</small>
              {p.colors.length > 0 && <div className="ad-sw">{p.colors.map((c) => <i key={c.id} style={{ background: c.hex }} />)}<small>{p.colors.length} couleur(s)</small></div>}
            </div>
          </button>
          <div className="ad-pfoot">
            <button className="ad-link" onClick={() => setEdit(p)}>Modifier</button>
            <button className="ad-link danger" onClick={() => del(p)}>Supprimer</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Calculateur ("Calculer mon besoin") ----------------
   Every product of the calculator lives here: add / edit / hide / delete — no code needed.
   • Primaire = proposé selon la famille (époxy / polyuréthane) + le support (béton / surface lisse)
   • Finition = proposée selon la famille + l'emplacement + le type (filmogène / autolissant), avec ses couleurs et prix */
const FAM_OPTS = [['epoxy', 'Époxy'], ['polyurethane', 'Polyuréthane'], ['both', 'Les deux']]
const SUP_OPTS = [['concrete', 'Béton'], ['smooth', 'Surface lisse'], ['both', 'Les deux']]
const LOC_OPTS = [['interior', 'Intérieur'], ['exterior', 'Extérieur'], ['both', 'Les deux']]
const THK_OPTS = [['lt1', 'Filmogène · rouleau'], ['gt1', 'Autolissant · raclette'], ['both', 'Les deux']]
const lab = (opts, v) => (opts.find((o) => o[0] === v) || [, '—'])[1]
const rulesText = (d) => (d.role === 'primer'
  ? `${lab(FAM_OPTS, d.family)} · ${lab(SUP_OPTS, d.support)}`
  : `${lab(FAM_OPTS, d.family)} · ${lab(LOC_OPTS, d.location)} · ${lab(THK_OPTS, d.thickness)}`)

const newDraft = (role) => ({
  slot: null, role, active: true, name_fr: '', image_url: '', family: 'both', support: 'both', location: 'both', thickness: 'both',
  bucket_kg: 20, small_kg: 10, coverage_m2_per_kg: role === 'primer' ? 5 : 2.5,
  price: null, price_small: null, price_wholesale: null, colorsFrom: null, colors: [], sort_order: null,
})

function CalcEditor({ d, all, onClose, onSaved, notify }) {
  const isNew = !d.slot
  const isPrimer = d.role === 'primer'
  const [p, setP] = useState({
    name: d.name_fr, image_url: d.image_url || '',
    family: d.family, support: d.support, location: d.location, thickness: d.thickness, active: d.active !== false,
    colors_from: d.colorsFrom || '', sort_order: d.sort_order ?? '',
    bucket_kg: d.bucket_kg, small_kg: d.small_kg ?? 0,
    cover: Math.round(d.coverage_m2_per_kg * d.bucket_kg * 100) / 100,   // m² covered by one big bucket
    price: d.price ?? '', price_small: d.price_small ?? '', price_wholesale: d.price_wholesale ?? '',
    colors: (d.colors || []).map((c) => ({ ...c })),
  })
  const [test, setTest] = useState('100')
  const [busy, setBusy] = useState(false)
  const [up, setUp] = useState(false)
  const [err, setErr] = useState('')
  const [bad, setBad] = useState('')
  const colorsRef = useRef(null)
  const priceRef = useRef(null)
  const nameRef = useRef(null)
  const set = (k, v) => setP((o) => ({ ...o, [k]: v }))
  const linked = !isPrimer && Boolean(p.colors_from)
  const source = linked ? all[p.colors_from] : null
  // finishes this one may copy its colours from (not itself, not already a copy)
  const sources = Object.values(all).filter((x) => x.role === 'finition' && x.slot !== d.slot && !x.colorsFrom)

  const slot = { bucket_kg: num(p.bucket_kg), small_kg: num(p.small_kg) || 0, coverage_m2_per_kg: (num(p.cover) || 0) / (num(p.bucket_kg) || 1) }
  const example = useMemo(() => {
    const pr = isPrimer ? p : { ...effPrice(p, linked ? source?.colors?.[0] : p.colors[0]) }
    if (!pr || !(Number(pr.price) > 0)) return calcMix(slot, { price: 1 }, Number(test)) && { ...calcMix(slot, { price: 1 }, Number(test)), total: null }
    return calcMix(slot, pr, Number(test))
  }, [p, test]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault()
    const fail = (field, ref, msg) => { setBad(field); setErr(msg); ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
    if (!p.name.trim()) return fail('name', nameRef, '👆 Donnez un nom au produit.')
    if (!(slot.bucket_kg > 0) || !(slot.coverage_m2_per_kg > 0)) return fail('size', priceRef, '👆 Indiquez la taille du seau et la surface qu\'il couvre.')
    if (isPrimer && !(Number(p.price) > 0)) return fail('price', priceRef, `👆 Entrez le prix du seau de ${p.bucket_kg} kg.`)
    if (!isPrimer && !linked && !p.colors.length) return fail('colors', colorsRef, '👆 Ajoutez au moins une couleur (avec son prix).')
    if (!isPrimer && !linked && !(Number(p.price) > 0) && !p.colors.every((c) => Number(c.price) > 0)) return fail('price', priceRef, `👆 Entrez le prix du seau de ${p.bucket_kg} kg ou un prix pour chaque couleur.`)
    setBusy(true); setErr(''); setBad('')
    try {
      await api('/api/admin/calc', {
        method: 'POST',
        body: {
          slot: d.slot, role: d.role, name: p.name, image_url: p.image_url || null, active: p.active,
          family: p.family, support: p.support, location: p.location, thickness: p.thickness,
          colors_from: linked ? p.colors_from : null, sort_order: p.sort_order === '' ? null : Number(p.sort_order),
          bucket_kg: slot.bucket_kg, small_kg: slot.small_kg, coverage_m2_per_kg: slot.coverage_m2_per_kg,
          price: linked ? null : p.price, price_small: linked ? null : p.price_small, price_wholesale: linked ? null : p.price_wholesale,
          colors: linked ? [] : p.colors.map((c) => ({ id: c.id, name_fr: c.name_fr, name_ar: c.name_ar, hex: c.hex, price: c.price, price_small: c.price_small, price_wholesale: c.price_wholesale })),
        },
      })
      onSaved(isNew ? 'Produit ajouté ✓' : 'Enregistré ✓')
    } catch (e2) {
      setErr(e2.status === 401 ? 'Session expirée. Reconnectez-vous.' : `Erreur d'enregistrement (${e2.message}). Réessayez.`)
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Supprimer « ${p.name || 'ce produit'} » ? Cette action est définitive.`)) return
    setBusy(true)
    try { await api('/api/admin/calc', { method: 'DELETE', body: { slot: d.slot } }); onSaved('Produit supprimé') }
    catch { setErr('Suppression impossible. Réessayez.'); setBusy(false) }
  }

  return (
    <form className="ad-sheet" onSubmit={save}>
      <div className="ad-sheet-top">
        <button type="button" className="ad-link" onClick={onClose}>← Retour</button>
        <strong>{isNew ? (isPrimer ? 'Nouveau primaire' : 'Nouvelle finition') : p.name || 'Produit'}</strong>
        <span />
      </div>
      <div className="ad-sheet-body">
        <div className="ad-col">
          <PhotoField value={p.image_url} onChange={(v) => set('image_url', v)} onBusy={setUp} hint="apparaît sur le reçu du client" />
          <section className={`ad-card ${bad === 'name' ? 'bad' : ''}`} ref={nameRef}>
            <h3>Nom affiché au client</h3>
            <input className="ad-big" value={p.name} onChange={(e) => set('name', e.target.value)} placeholder={isPrimer ? 'Ex : Primaire Époxy Traité' : 'Ex : Finition Époxy Filmogène'} />
            <div className="ad-auto">🌐 Écrivez en français ou en arabe : la traduction est automatique.</div>
          </section>
          <section className="ad-card">
            <h3>Quand est-il proposé ?</h3>
            <div className="ad-hint">Le calculateur choisit tout seul ce produit quand les réponses du client correspondent à ces choix.</div>
            <div className="ad-field"><label>Famille</label><Seg value={p.family} options={FAM_OPTS} onChange={(v) => set('family', v)} /></div>
            {isPrimer
              ? <div className="ad-field"><label>Support (surface)</label><Seg value={p.support} options={SUP_OPTS} onChange={(v) => set('support', v)} /></div>
              : (
                <>
                  <div className="ad-field"><label>Emplacement</label><Seg value={p.location} options={LOC_OPTS} onChange={(v) => set('location', v)} /></div>
                  <div className="ad-field"><label>Type de finition</label><Seg value={p.thickness} options={THK_OPTS} onChange={(v) => set('thickness', v)} /></div>
                </>
              )}
            <label className="ad-check"><input type="checkbox" checked={p.active} onChange={(e) => set('active', e.target.checked)} /> Visible sur le site</label>
            <div className="ad-field"><label>Ordre <small>(petit numéro = proposé en premier)</small></label>
              <input type="number" inputMode="numeric" value={p.sort_order} onChange={(e) => set('sort_order', e.target.value)} placeholder="auto" /></div>
          </section>
        </div>

        <div className="ad-col">
          <section className={`ad-card ${bad === 'size' ? 'bad' : ''}`} ref={priceRef}>
            <h3>Seaux et quantité</h3>
            <div className="ad-two">
              <div className="ad-field"><label>Grand seau</label>
                <div className="ad-suffix"><input type="number" step="any" min="0" inputMode="decimal" value={p.bucket_kg} onChange={(e) => set('bucket_kg', e.target.value)} /><span>kg</span></div></div>
              <div className="ad-field"><label>Petit seau <small>(0 = aucun)</small></label>
                <div className="ad-suffix"><input type="number" step="any" min="0" inputMode="decimal" value={p.small_kg} onChange={(e) => set('small_kg', e.target.value)} /><span>kg</span></div></div>
            </div>
            <div className="ad-field"><label>Un seau de {p.bucket_kg || '…'} kg couvre{isPrimer || p.thickness === 'gt1' ? '' : ' (pour 2 couches)'}</label>
              <div className="ad-suffix"><input type="number" step="any" min="0" inputMode="decimal" value={p.cover} onChange={(e) => set('cover', e.target.value)} /><span>m²</span></div></div>
            <div className="ad-example">
              <div className="ad-test">Exemple pour <input type="number" min="0" inputMode="decimal" value={test} onChange={(e) => setTest(e.target.value)} /> m² :</div>
              {example
                ? <>→ <b>{example.kg} kg</b> → <b>{packsText(example.packs, 'kg')}</b>{example.total ? <> → <b>{money(example.total)} DA</b></> : null}</>
                : <>Entrez une surface.</>}
            </div>
          </section>

          {!isPrimer && (
            <section className="ad-card">
              <h3>Couleurs et prix</h3>
              <div className="ad-field"><label>Utiliser les mêmes couleurs et prix qu'une autre finition ?</label>
                <select value={p.colors_from} onChange={(e) => set('colors_from', e.target.value)}>
                  <option value="">Non, ce produit a ses propres couleurs</option>
                  {sources.map((x) => <option key={x.slot} value={x.slot}>{x.name_fr}</option>)}
                </select></div>
              {linked && source && (
                <>
                  <div className="ad-hint">Les couleurs et les prix sont ceux de « {source.name_fr} ». Modifiez-les sur ce produit.</div>
                  <div className="ad-sw">{(source.colors || []).map((c) => <i key={c.id} style={{ background: c.hex }} />)}<small>{(source.colors || []).length} couleur(s)</small></div>
                </>
              )}
            </section>
          )}

          {!linked && (
            <section className={`ad-card ${bad === 'price' ? 'bad' : ''}`}>
              <h3>{isPrimer ? 'Prix' : 'Prix par défaut'}</h3>
              {!isPrimer && <div className="ad-hint">Prix de toutes les couleurs. Vous pouvez donner un prix différent à une couleur plus bas.</div>}
              <div className="ad-two">
                <div className="ad-field"><label>Prix du seau {p.bucket_kg} kg {isPrimer && <em className="req">obligatoire</em>}</label>
                  <div className="ad-suffix"><input className={bad === 'price' ? 'bad' : ''} type="number" step="any" min="0" inputMode="decimal" value={p.price} onChange={(e) => set('price', e.target.value)} /><span>DA</span></div></div>
                {num(p.small_kg) > 0 && <div className="ad-field"><label>Prix du seau {p.small_kg} kg</label>
                  <div className="ad-suffix"><input type="number" step="any" min="0" inputMode="decimal" value={p.price_small} onChange={(e) => set('price_small', e.target.value)} placeholder="auto" /><span>DA</span></div></div>}
              </div>
              {num(p.small_kg) > 0 && <div className="ad-hint">Seau {p.small_kg} kg vide = calculé automatiquement (proportionnel au grand seau).</div>}
              <div className="ad-field"><label>Prix de gros du seau {p.bucket_kg} kg <small>(à partir de 200 m², facultatif · vide = prix de détail −5 %)</small></label>
                <div className="ad-suffix"><input type="number" step="any" min="0" inputMode="decimal" value={p.price_wholesale} onChange={(e) => set('price_wholesale', e.target.value)} /><span>DA</span></div></div>
            </section>
          )}

          {!isPrimer && !linked && (
            <section className={`ad-card ${bad === 'colors' ? 'bad' : ''}`} ref={colorsRef}>
              <h3>Couleurs <small>({p.colors.length}/24)</small></h3>
              <ColorsEditor advanced optionalPrice colors={p.colors} onChange={(c) => set('colors', c)} max={24} bad={bad === 'colors'} bucketKg={p.bucket_kg} smallKg={num(p.small_kg) || 0} defaultPrice={p.price} />
            </section>
          )}

          {!isNew && <button type="button" className="ad-btn ghost block ad-danger" onClick={remove} disabled={busy}>🗑️ Supprimer ce produit</button>}
        </div>
        {err && <div className="ad-error full">{err}</div>}
      </div>
      <div className="ad-savebar">
        <button className="ad-btn primary block" disabled={busy || up}>{busy ? 'Enregistrement…' : isNew ? 'Ajouter le produit' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}

function CalcAdmin({ notify }) {
  const [data, setData] = useState(null)
  const [edit, setEdit] = useState(null) // slot | { draft }
  const load = useCallback(() => api('/api/admin/calc').then(setData).catch(() => {}), [])
  useEffect(() => { load() }, [load])

  if (!data) return null
  if (edit) {
    const d = edit.draft || data[edit.slot]
    if (d) return <CalcEditor key={d.slot || 'new'} d={d} all={data} notify={notify} onClose={() => setEdit(null)} onSaved={(m) => { setEdit(null); notify(m); load() }} />
  }

  const sorted = (role) => Object.values(data).filter((d) => d.role === role).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const hasPrice = (d) => Number(d.price) > 0
  const ready = (d) => (d.role === 'primer' ? hasPrice(d) : (d.colors || []).length > 0 && (hasPrice(d) || d.colors.every((c) => Number(c.price) > 0)))
  const all = Object.values(data).filter((d) => d.active)
  const allReady = all.length > 0 && all.every(ready)
  const smallPrice = (d, price) => (Number(d.small_kg) > 0 ? Math.round((Number(price) * Number(d.small_kg)) / Number(d.bucket_kg)) : 0)

  const Card = ({ d }) => {
    const ok = ready(d)
    return (
      <button key={d.slot} className={`ad-card ad-product ad-calc ${d.active ? '' : 'off'}`} onClick={() => setEdit({ slot: d.slot })}>
        <div className="ad-pimg">{d.image_url ? <img src={d.image_url} alt="" /> : d.role === 'primer' ? '🧴' : '🎨'}</div>
        <div className="ad-product-main">
          <div className="ad-product-info">
            <strong>{d.name_fr}</strong>
            <small>{rulesText(d)}</small>
            <small>{d.bucket_kg} kg{d.small_kg > 0 ? ` + ${d.small_kg} kg` : ''} · 1 seau de {d.bucket_kg} kg = {Math.round(d.coverage_m2_per_kg * d.bucket_kg * 100) / 100} m²</small>
            {d.role === 'finition' && <div className="ad-sw">{d.colors.map((c) => <i key={c.id} style={{ background: c.hex }} />)}<small>{d.colors.length} couleur(s){d.colorsFrom ? ` · copiées de « ${data[d.colorsFrom]?.name_fr || '…'} »` : ''}</small></div>}
            {hasPrice(d)
              ? <small><b>{money(d.price)} DA</b> / {d.bucket_kg} kg{d.small_kg > 0 ? ` · ${money(Number(d.price_small) || smallPrice(d, d.price))} DA / ${d.small_kg} kg` : ''}</small>
              : <small>{d.role === 'primer' ? 'Prix à entrer' : 'Prix par couleur'}</small>}
          </div>
        </div>
        <div className="ad-pfoot">
          <span className="ad-tag" style={{ '--c': !d.active ? '#8b8b93' : ok ? '#16a34a' : '#c9971c' }}>{!d.active ? 'Masqué' : ok ? 'Prêt' : 'À compléter'}</span>
          <span className="ad-link">Modifier</span>
        </div>
      </button>
    )
  }

  const Section = ({ role, title, sub, addLabel }) => (
    <section className="ad-calc-sec">
      <div className="ad-calc-head"><div><h2>{title}</h2><p>{sub}</p></div>
        <button className="ad-btn primary" onClick={() => setEdit({ draft: newDraft(role) })}>＋ {addLabel}</button></div>
      <div className="ad-pgrid">
        {sorted(role).map((d) => <Card key={d.slot} d={d} />)}
        {sorted(role).length === 0 && <div className="ad-auto">Aucun produit pour le moment.</div>}
      </div>
    </section>
  )

  return (
    <>
      <div className={`ad-auto ${allReady ? 'ok' : ''}`}>
        {allReady ? '✅ Le calculateur est prêt : tous les produits visibles ont leurs prix.' : '👇 Complétez les produits « À compléter » (prix, couleurs) pour que la page « Calculer mon besoin » fonctionne.'}
      </div>
      <Section role="primer" title="Primaires" sub="Choisis automatiquement selon la famille (époxy / polyuréthane) et le support (béton / surface lisse)." addLabel="Ajouter un primaire" />
      <Section role="finition" title="Finitions" sub="Choisies selon la famille, l'emplacement (intérieur / extérieur) et le type (filmogène / autolissant). Chaque couleur a son prix." addLabel="Ajouter une finition" />
    </>
  )
}

/* ---------------- Contact ---------------- */
function ContactForm({ notify }) {
  const [s, setS] = useState(null)
  const [busy, setBusy] = useState(false)
  const [upV, setUpV] = useState('')
  useEffect(() => {
    api('/api/admin/settings').then((d) => setS({ ...d, address: d.address_fr || d.address_ar || '', hours: d.hours_fr || d.hours_ar || '' })).catch(() => {})
  }, [])
  if (!s) return null
  const f = (k, label, dir, ph, type) => (
    <div className="ad-field"><label>{label}</label>
      <input type={type || 'text'} dir={dir} placeholder={ph} value={s[k] || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>
  )
  const uploadCatalog = async (k, file) => {
    if (!file) return
    if (file.type !== 'application/pdf') { notify('Choisissez un fichier PDF.'); return }
    if (file.size > 25 * 1024 * 1024) { notify('PDF trop lourd (max 25 Mo). Compressez-le.'); return }
    setUpV(k)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { url } = await api('/api/admin/upload', { method: 'POST', form: fd })
      setS((o) => ({ ...o, [k]: url })); notify('PDF envoyé — pensez à enregistrer')
    } catch { notify("Échec de l'envoi du PDF") }
    setUpV('')
  }
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await api('/api/admin/settings', { method: 'PUT', body: s }); notify('Enregistré ✓') }
    catch { notify("Erreur d'enregistrement") }
    setBusy(false)
  }
  return (
    <form onSubmit={save} className="ad-contact">
      <section className="ad-card"><h3>📄 Catalogues d'application</h3>
        <div className="ad-auto">Le client voit le bouton « Voir le catalogue » dès qu'il choisit l'épaisseur, et le lien apparaît aussi sur son reçu. « Filmogène » = rouleau, « Autolissant » = raclette. Envoyez un PDF par outil (max 25 Mo) ou collez un lien. Tant qu'aucun PDF n'est envoyé, rien ne s'affiche.</div>
        {[['catalog_roller', 'Catalogue — Rouleau (Filmogène)'], ['catalog_squeegee', 'Catalogue — Raclette (Autolissant)']].map(([k, label]) => (
          <div className="ad-field" key={k}><label>{label}</label>
            <div className="ad-vid-row">
              <label className="ad-btn ghost">{upV === k ? 'Envoi…' : (s[k] ? 'Remplacer le PDF' : 'Envoyer un PDF')}<input type="file" accept="application/pdf" hidden onChange={(e) => uploadCatalog(k, e.target.files?.[0])} /></label>
              {s[k] && <a className="ad-link" href={s[k]} target="_blank" rel="noreferrer">Ouvrir</a>}
              {s[k] && <button type="button" className="ad-link danger" onClick={() => setS({ ...s, [k]: '' })}>Retirer</button>}
            </div>
            <input type="url" dir="ltr" placeholder="ou collez un lien" value={s[k] || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
          </div>
        ))}
      </section>
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

  const tabs = [['orders', 'Commandes', ICONS.orders], ['calc', 'Calculateur', ICONS.calc], ['products', 'Produits', ICONS.products], ['contact', 'Contact', ICONS.contact]]

  return (
    <div className="ad">
      <header className="ad-top">
        <div className="ad-top-in">
          <img src="/logo.png" alt="DECO DZ" />
          <div className="ad-top-actions">
            <Link to="/" className="ad-link">Voir le site</Link>
            <button className="ad-link" onClick={logout}>Quitter</button>
          </div>
        </div>
      </header>

      <main className="ad-main">
        <div className="ad-head"><div><h1>{tabs.find((t) => t[0] === tab)[1]}</h1><p>{{ orders: 'Reçus de vos clients : appelez, écrivez sur WhatsApp, suivez le statut', calc: 'Les produits de la page « Calculer mon besoin » : prix, couleurs et photos du reçu', products: 'Produits simples : photo, description, couleurs et prix', contact: 'Coordonnées et catalogues affichés sur le site' }[tab]}</p></div></div>
        {tab === 'orders' && <Orders onCount={setCount} notify={notify} />}
        {tab === 'calc' && <CalcAdmin notify={notify} />}
        {tab === 'products' && <Products notify={notify} />}
        {tab === 'contact' && <ContactForm notify={notify} />}
      </main>

      <nav className="ad-nav">
        <div className="ad-brand"><img src="/logo.png" alt="DECO DZ" /></div>
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
