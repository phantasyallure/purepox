import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'
import { fetchCalc } from '../lib/data'
import { calcMix, effPrice, primerSlot, finSlot, gt1Allowed, TOOL_OF, packsText, money } from '../lib/calc'
import { waLink } from '../lib/whatsapp'
import { WaIcon } from '../components/WhatsAppButton'

export default function Solution({ settings }) {
  const { t, pick } = useLang()
  const { add, setOpen } = useCart()
  const [calc, setCalc] = useState(null)
  const [a, setA] = useState({ family: null, location: null, thickness: null })
  const [area, setArea] = useState('')
  const [colorId, setColorId] = useState(null)
  const [custom, setCustom] = useState(false) // "other colour" = request sent to the admin, no price
  const [customName, setCustomName] = useState('')
  const [customHex, setCustomHex] = useState('')
  const [need, setNeed] = useState(null)

  useEffect(() => {
    document.body.classList.add('on-product')
    window.scrollTo(0, 0)
    fetchCalc().then(setCalc).catch(() => setCalc({}))
    return () => document.body.classList.remove('on-product')
  }, [])

  const set = (k, v) => {
    setA((o) => {
      const n = { ...o, [k]: v }
      if (n.family === 'epoxy') n.location = 'interior' // epoxy = interior only
      if (!gt1Allowed(n.family, n.location) && n.thickness === 'gt1') n.thickness = null // polyurethane exterior = no +1 mm
      return n
    })
    if (k === 'family' || k === 'location') setColorId(null)
    setNeed(null)
  }

  const answered = Boolean(a.family && a.location && a.thickness)
  const finKey = answered ? finSlot(a.family, a.location, a.thickness) : null
  const fin = finKey ? calc?.[finKey] : null
  // colours shown before the thickness is chosen come from the roller slot (same colours & prices at +1 mm)
  const colorSrc = fin || (a.family && a.location ? calc?.[finSlot(a.family, a.location, 'lt1')] : null)
  const pri = a.family ? calc?.[primerSlot(a.family)] : null
  const finColors = (colorSrc?.colors || []).map((c) => ({ ...c, ...effPrice(colorSrc, c) })).filter((c) => Number(c.price) > 0)
  const priOk = Boolean(pri && Number(pri.price) > 0)
  const finOk = finColors.length > 0
  const color = !custom ? finColors.find((c) => c.id === colorId) || null : null
  const cName = customName.trim() || customHex
  const customColor = custom && cName ? { name_fr: cName, name_ar: cName, hex: customHex || '#cccccc' } : null
  const hasColor = Boolean(color || customColor)
  const m2 = Number(area)

  const priRes = useMemo(() => (priOk && m2 > 0 ? calcMix(pri, pri, m2) : null), [pri, priOk, m2])
  // custom colour: quantities are computed, but no price (shown "sur demande", not in the total)
  const finRes = useMemo(() => (fin && hasColor && m2 > 0 ? calcMix(fin, color || { price: 0 }, m2) : null), [fin, color, hasColor, m2])

  const noMatch = Boolean(calc && answered && (!priOk || !fin))
  const ready = Boolean(answered && !noMatch && hasColor && priRes && finRes)
  const total = ready ? priRes.total + (customColor ? 0 : finRes.total) : 0
  const gt1Ok = gt1Allowed(a.family, a.location)
  const tool = a.thickness ? TOOL_OF[a.thickness] : null

  // application catalogue (PDF from the admin): roller for < 1 mm, squeegee for > 1 mm
  const catalog = a.thickness === 'lt1' ? settings?.catalog_roller : a.thickness === 'gt1' ? settings?.catalog_squeegee : ''

  const missing = () => (!answered ? 'choices' : !hasColor ? 'color' : !m2 ? 'area' : null)
  const guard = () => {
    const m = missing()
    if (!m) return true
    setNeed(m)
    document.getElementById(`sol-${m}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return false
  }

  const lineOf = (p, c, r, role) => ({
    role, product_fr: p.name_fr, product_ar: p.name_ar || p.name_fr, image_url: p.image_url || '',
    color_fr: c?.name_fr, color_ar: c?.name_ar || c?.name_fr, hex: c?.hex, kg: r.kg, packs: r.packs,
    on_demand: Boolean(c?.custom), total: c?.custom ? 0 : r.total,
  })
  const order = () => {
    if (!guard() || !ready) return
    add({
      kind: 'calc',
      answers: { family: a.family, location: a.location, thickness: a.thickness, area: m2, color_id: color?.id, custom_color: customColor ? { name: customColor.name_fr, hex: customHex || '' } : undefined },
      info: { ...a, area: m2, tool, catalog: catalog || '' },
      lines: [lineOf(pri, null, priRes, 'primer'), lineOf(fin, customColor ? { ...customColor, custom: true } : color, finRes, 'finition')],
      total,
    })
    setOpen(true)
  }

  const askMsg = `${t('ask_msg')}${a.family ? t(`fam_${a.family}`) : ''} · ${a.location ? t(`loc_${a.location}`) : ''} · ${a.thickness ? t(`th_${a.thickness}`) : ''}`

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

  const Line = ({ role, p, c, res, onDemand }) => (
    <div className="sol-line">
      {p.image_url && <img className="sol-thumb" src={p.image_url} alt="" loading="lazy" />}
      <div className="sol-line-main">
        <span className={`role ${role === 'finition' ? 'fin' : ''}`}>{t(role === 'finition' ? 'role_finition' : 'role_primer')}</span>
        <b>{pick(p, 'name')}{c ? ` — ${pick(c, 'name')}` : ''}</b>
        {res
          ? <div className="sol-qp"><span className="q">{packsText(res.packs, t('kg'))} <em>({res.kg} {t('kg')})</em></span><span className={`pr ${onDemand ? 'od' : ''}`}>{onDemand ? t('on_demand') : `${money(res.total)} ${t('currency')}`}</span></div>
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
            <span className="pp-label">{t('f_location')}</span>
            {seg('location', [['interior', t('loc_interior'), a.family === 'polyurethane' ? t('pu_standard') : ''], ['exterior', t('loc_exterior'), a.family === 'epoxy' ? t('loc_ext_locked') : a.family === 'polyurethane' ? t('pu_antiuv') : '', '', a.family === 'epoxy']])}
          </div>
          <div className="sol-row">
            <span className="pp-label">{t('f_thickness')}</span>
            <div>
              {seg('thickness', [['lt1', t('th_lt1'), `🖌️ ${t('tool_roller')}`], ['gt1', t('th_gt1'), gt1Ok ? `🖌️ ${t('tool_squeegee')}` : t('gt1_ext_locked'), '', !gt1Ok]])}
              {tool && <div className="sol-note"><b>{t(`tool_${tool}_d`)}</b></div>}
              {catalog && <a className="sol-watch" href={catalog} target="_blank" rel="noreferrer">📄 {t('view_catalog')} — {t(`tool_${tool}`)}</a>}
            </div>
          </div>
          <div id="sol-color" className={`sol-row ${need === 'color' ? 'need' : ''}`}>
            <span className="pp-label">{t('step_color')}{(customColor || color) && <em className="sol-cname"> · {pick(customColor || color, 'name')}</em>}</span>
            {!a.family || !a.location ? (
              <div className="sol-cprice"><span className="muted">{t('color_first')}</span></div>
            ) : (
              <div>
                <div className="sol-sw">
                  {finColors.map((c) => (
                    <button key={c.id} type="button" className={!custom && c.id === colorId ? 'on' : ''} onClick={() => { setColorId(c.id); setCustom(false); setNeed(null) }} aria-label={pick(c, 'name')} title={`${pick(c, 'name')} — ${money(c.price)} ${t('currency')}`}>
                      <i style={{ background: c.hex }} />
                    </button>
                  ))}
                  <button type="button" className={`sol-other-pill ${custom ? 'on' : ''}`} onClick={() => { setCustom(true); setColorId(null); setNeed(null) }} aria-pressed={custom}>
                    <b>+</b> {t('custom_color')}
                  </button>
                </div>
                {custom ? (
                  <div className="sol-custom">
                    <div className="sol-custom-card">
                      <label className="sol-pick" style={{ background: customHex || '#e4e4e8' }} title={t('custom_color')}>
                        <input type="color" value={customHex || '#cccccc'} onChange={(e) => { setCustomHex(e.target.value); setNeed(null) }} aria-label={t('custom_color')} />
                        {!customHex && <span>🎨</span>}
                      </label>
                      <input type="text" maxLength={60} value={customName} placeholder={t('custom_ph')} onChange={(e) => { setCustomName(e.target.value); setNeed(null) }} />
                    </div>
                    <p className="sol-custom-note"><span className="sol-od-badge">{t('on_demand')}</span> {t('custom_note')}</p>
                  </div>
                ) : (
                  <div className="sol-cprice">{color ? unitText(fin || colorSrc, color) : <span className="muted">{finOk ? t('pick_color') : t('custom_color')}</span>}</div>
                )}
              </div>
            )}
          </div>
          <div id="sol-area" className={`sol-row ${need === 'area' ? 'need' : ''}`}>
            <span className="pp-label">{t('step_area')}</span>
            <label className="pp-area sol-area">
              <input type="number" min="0" step="any" inputMode="decimal" dir="ltr" value={area} placeholder={t('surface_ph')} onChange={(e) => { setArea(e.target.value); setNeed(null) }} />
              <span>{t('m2')}</span>
            </label>
          </div>
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
            {answered && !noMatch && fin && (
              <>
                <Line role="primer" p={pri} res={priRes} />
                <Line role="finition" p={fin} c={customColor || color} res={finRes} onDemand={Boolean(customColor)} />
                <div className="sol-facts">
                  <span>🖌️ {t(`tool_${tool}_d`)}</span>
                </div>
                <div className="pp-total"><span>{t('total')}</span><b>{ready ? `${money(total)} ${t('currency')}` : '—'}</b></div>
                {customColor && <p className="sol-od-note">{t('od_total_note')}</p>}
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

      {/* floating total: only once everything is chosen */}
      {ready && (
        <div className="pp-bar">
          <div><small>{t('total')}</small><b>{money(total)} {t('currency')}</b></div>
          <button className="btn primary" onClick={order}>{t('order_btn')}</button>
        </div>
      )}
    </div>
  )
}
