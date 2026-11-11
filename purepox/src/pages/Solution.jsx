import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'
import { fetchCalc } from '../lib/data'
import { calcMix, primerSlot, SLOTS, TOOL_OF, LAYERS, packsText, money } from '../lib/calc'
import { waLink } from '../lib/whatsapp'
import { WaIcon } from '../components/WhatsAppButton'

export default function Solution({ settings }) {
  const { t, pick, lang } = useLang()
  const { add, setOpen } = useCart()
  const [calc, setCalc] = useState(null)
  const [a, setA] = useState({ family: null, support: null, location: null, thickness: null })
  const [area, setArea] = useState('')
  const [colorId, setColorId] = useState(null)
  const [need, setNeed] = useState(null)

  useEffect(() => {
    document.body.classList.add('on-product')
    window.scrollTo(0, 0)
    fetchCalc().then(setCalc).catch(() => setCalc({}))
    return () => document.body.classList.remove('on-product')
  }, [])

  const set = (k, v) => {
    setA((o) => ({ ...o, [k]: v, ...(k === 'family' && v === 'epoxy' ? { location: 'interior' } : {}) })) // epoxy = interior only
    if (k === 'family') setColorId(null)
    setNeed(null)
  }

  const fin = a.family ? calc?.[a.family] : null
  const pri = a.support ? calc?.[primerSlot(a.support)] : null
  const finColors = (fin?.colors || []).filter((c) => Number(c.price) > 0)
  const priOk = Boolean(pri && Number(pri.price) > 0)
  const finOk = finColors.length > 0
  const color = finColors.find((c) => c.id === colorId) || null
  const m2 = Number(area)

  const priRes = useMemo(() => (priOk && m2 > 0 ? calcMix(pri, pri, m2) : null), [pri, priOk, m2])
  const finRes = useMemo(() => (finOk && color && m2 > 0 ? calcMix(fin, color, m2) : null), [fin, finOk, color, m2])

  const answered = Boolean(a.family && a.support && a.location && a.thickness)
  const noMatch = Boolean(calc && answered && (!finOk || !priOk))
  const ready = Boolean(answered && !noMatch && color && priRes && finRes)
  const total = ready ? priRes.total + finRes.total : 0
  const tool = a.thickness ? TOOL_OF[a.thickness] : null

  const slotName = (key) => (calc?.[key] ? pick(calc[key], 'name') : lang === 'ar' ? SLOTS[key].ar : SLOTS[key].fr)
  const catalog = a.support === 'concrete' ? settings?.catalog_concrete : a.support === 'smooth' ? settings?.catalog_smooth : ''

  const missing = () => (!answered ? 'choices' : !m2 ? 'area' : !color ? 'color' : null)
  const guard = () => {
    const m = missing()
    if (!m) return true
    setNeed(m)
    document.getElementById(`sol-${m}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return false
  }

  const lineOf = (p, c, r, role) => ({
    role, product_fr: p.name_fr, product_ar: p.name_ar || p.name_fr, image_url: p.image_url || '',
    color_fr: c?.name_fr, color_ar: c?.name_ar || c?.name_fr, hex: c?.hex, kg: r.kg, packs: r.packs, total: r.total,
  })
  const order = () => {
    if (!guard() || !ready) return
    add({
      kind: 'calc',
      answers: { family: a.family, support: a.support, location: a.location, thickness: a.thickness, area: m2, color_id: color.id },
      info: { ...a, area: m2, tool, layers: LAYERS },
      lines: [lineOf(pri, null, priRes, 'primer'), lineOf(fin, color, finRes, 'finition')],
      total,
    })
    setOpen(true)
  }

  const askMsg = `${t('ask_msg')}${a.family ? t(`fam_${a.family}`) : ''} · ${a.support ? t(`surf_${a.support === 'smooth' ? 'smooth' : 'concrete'}`) : ''}`

  // price of one bucket (big / small) of a primer or a colour
  const unitText = (slot, pr) => {
    const big = Number(slot.bucket_kg), sm = Number(slot.small_kg)
    const small = sm > 0 ? Math.round(Number(pr.price_small) || (Number(pr.price) * sm) / big) : 0
    return `${money(pr.price)} ${t('currency')} / ${big} ${t('kg')}${small ? ` · ${money(small)} ${t('currency')} / ${sm} ${t('kg')}` : ''}`
  }

  const seg = (k, opts) => (
    <div className="pp-seg sol-seg">
      {opts.map(([v, label, sub, sub2, off]) => (
        <button key={v} type="button" disabled={off} className={a[k] === v ? 'on' : ''} aria-pressed={a[k] === v} onClick={() => set(k, v)}>
          <b>{label}</b>{sub && <small>{sub}</small>}{sub2 && <small className="sol-primer">{sub2}</small>}
        </button>
      ))}
    </div>
  )

  const Line = ({ role, p, c, res }) => (
    <div className="sol-line">
      {p.image_url && <img className="sol-thumb" src={p.image_url} alt="" loading="lazy" />}
      <div className="sol-line-main">
        <span className={`role ${role === 'finition' ? 'fin' : ''}`}>{t(role === 'finition' ? 'role_finition' : 'role_primer')}</span>
        <b>{pick(p, 'name')}{c ? ` — ${pick(c, 'name')}` : ''}</b>
        {res
          ? <div className="sol-qp"><span className="q">{packsText(res.packs, t('kg'))} <em>({res.kg} {t('kg')})</em></span><span className="pr">{money(res.total)} {t('currency')}</span></div>
          : <div className="q muted">{!m2 ? t('enter_area') : t('pick_color')}</div>}
      </div>
    </div>
  )

  return (
    <div className="container pp sol">
      <div className="sol-head">
        <h1>{t('sol_title')}</h1>
        <p className="lead">{t('sol_sub')}</p>
      </div>

      <div className="sol-grid">
        <section className="sol-card">
          <div id="sol-choices" className={`sol-row ${need === 'choices' ? 'need' : ''}`}>
            <span className="pp-label">{t('f_family')}</span>
            {seg('family', [['epoxy', t('fam_epoxy'), t('fam_ep_where')], ['polyurethane', t('fam_polyurethane'), t('fam_pu_where')]])}
          </div>
          <div className="sol-row">
            <span className="pp-label">{t('f_surface')}</span>
            <div>
              {seg('support', [
                ['concrete', t('surf_concrete'), t('ex_concrete'), `${t('primer_is')} : ${slotName('primer_normal')}`],
                ['smooth', t('surf_smooth'), t('ex_smooth'), `${t('primer_is')} : ${slotName('primer_traite')}`],
              ])}
              {catalog && <a className="sol-watch" href={catalog} target="_blank" rel="noreferrer">📄 {t('view_catalog')}</a>}
            </div>
          </div>
          <div className="sol-row">
            <span className="pp-label">{t('f_location')}</span>
            {seg('location', [['interior', t('loc_interior')], ['exterior', t('loc_exterior'), a.family === 'epoxy' ? t('loc_ext_locked') : '', '', a.family === 'epoxy']])}
          </div>
          <div className="sol-row">
            <span className="pp-label">{t('f_thickness')}</span>
            <div>
              {seg('thickness', [['lt1', t('th_lt1'), `🖌️ ${t('tool_roller')}`], ['gt1', t('th_gt1'), `🖌️ ${t('tool_squeegee')}`]])}
              {tool && <div className="sol-note"><b>{t(`tool_${tool}_d`)}</b> · {t('layers_n')}</div>}
            </div>
          </div>
          <div id="sol-area" className={`sol-row ${need === 'area' ? 'need' : ''}`}>
            <span className="pp-label">{t('step_area')}</span>
            <label className="pp-area sol-area">
              <input type="number" min="0" step="any" inputMode="decimal" dir="ltr" value={area} placeholder={t('surface_ph')} onChange={(e) => { setArea(e.target.value); setNeed(null) }} />
              <span>{t('m2')}</span>
            </label>
          </div>
          {finOk && (
            <div id="sol-color" className={`sol-row ${need === 'color' ? 'need' : ''}`}>
              <span className="pp-label">{t('step_color')}{color && <em className="sol-cname"> · {pick(color, 'name')}</em>}</span>
              <div>
                <div className="sol-sw">
                  {finColors.map((c) => (
                    <button key={c.id} type="button" className={c.id === colorId ? 'on' : ''} onClick={() => { setColorId(c.id); setNeed(null) }} aria-label={pick(c, 'name')} title={`${pick(c, 'name')} — ${money(c.price)} ${t('currency')}`}>
                      <i style={{ background: c.hex }} />
                    </button>
                  ))}
                </div>
                <div className="sol-cprice">{color ? unitText(fin, color) : <span className="muted">{t('pick_color')}</span>}</div>
              </div>
            </div>
          )}
          {finOk && <a className="other-color sol-other" href={waLink(settings?.whatsapp, `${t('ask_msg')}${pick(fin, 'name')}`)} target="_blank" rel="noreferrer">{t('other_color')}</a>}
        </section>

        {/* ---------- suggestion ---------- */}
        <aside className="sol-result">
          <div className="pp-sum">
            <h2>{t('your_solution')}</h2>
            {!answered && <p className="muted">{t('sol_wait')}</p>}
            {noMatch && (
              <>
                <p className="muted">{t('sol_none')}</p>
                <a className="btn wa" href={waLink(settings?.whatsapp, askMsg)} target="_blank" rel="noreferrer"><WaIcon size={18} /> {t('ask_btn')}</a>
              </>
            )}
            {answered && !noMatch && (
              <>
                <Line role="primer" p={pri} res={priRes} />
                <Line role="finition" p={fin} c={color} res={finRes} />
                <div className="sol-facts">
                  <span>🖌️ {t(`tool_${tool}_d`)}</span>
                  <span>🧱 {t('layers_n')}</span>
                </div>
                <div className="pp-total"><span>{t('total')}</span><b>{ready ? `${money(total)} ${t('currency')}` : '—'}</b></div>
                {m2 >= 200 && <a className="big-project" href={waLink(settings?.whatsapp, `${pick(fin, 'name')} — ${m2} ${t('m2')}`)} target="_blank" rel="noreferrer"><WaIcon size={18} /> {t('big_project')}</a>}
              </>
            )}
            {a.family && (
              <div className="sol-tip">
                <span>💡 {a.family === 'polyurethane' ? t('tip_pu') : t('tip_ep')}</span>
                {a.family === 'epoxy' && <button type="button" onClick={() => set('family', 'polyurethane')}>{t('switch_pu')}</button>}
              </div>
            )}
            {answered && !noMatch && <div className="pp-actions"><button className="btn primary pp-order" onClick={order}>{t('order_btn')}</button></div>}
          </div>
        </aside>
      </div>

      <div className="pp-bar">
        <div><small>{t('total')}</small><b>{ready ? `${money(total)} ${t('currency')}` : '—'}</b></div>
        <button className="btn primary" onClick={order} disabled={noMatch}>{t('order_btn')}</button>
      </div>
    </div>
  )
}
