import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../lib/i18n'
import { useCart } from '../lib/cart'
import { fetchCalc } from '../lib/data'
import { calcMix, effPrice, primersFor, finishesFor, locationsFor, thicknessesFor, TOOL_OF, packsText, money, WHOLESALE_FROM } from '../lib/calc'
import { Ico } from '../lib/ico'
import { waLink } from '../lib/whatsapp'
import { WaIcon } from '../components/WhatsAppButton'

export default function Solution({ settings }) {
  const { t, pick } = useLang()
  const { add, setOpen } = useCart()
  const [calc, setCalc] = useState(null)
  const [a, setA] = useState({ family: null, support: null, location: null, thickness: null })
  const [area, setArea] = useState('')
  const [colorId, setColorId] = useState(null)
  const [finishSlot, setFinishSlot] = useState(null) // chosen finish when several products fit
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
      if (k === 'family') n.location = null
      // only one place / thickness exists for this choice → pick it for the client
      if (n.family && calc) {
        const locs = locationsFor(calc, n.family)
        if (!n.location && locs.length === 1) n.location = locs[0]
        if (n.location && !locs.includes(n.location)) n.location = null
        if (n.location) {
          const ths = thicknessesFor(calc, n.family, n.location)
          if (n.thickness && !ths.includes(n.thickness)) n.thickness = null
        }
      }
      return n
    })
    if (k === 'family' || k === 'location') setColorId(null) // the colour list changes
    if (k === 'family' || k === 'location' || k === 'thickness') setFinishSlot(null)
    setNeed(null)
  }

  const answered = Boolean(a.family && a.support && a.location && a.thickness)
  // every product comes from the admin (Admin → Calculateur): the choices below only show what exists
  const cands = answered ? finishesFor(calc, a.family, a.location, a.thickness) : []
  const fin = cands.find((p) => p.slot === finishSlot) || cands[0] || null
  // colours shown before the thickness is chosen come from the first finish of that family + place
  const colorSrc = fin || (a.family && a.location ? finishesFor(calc, a.family, a.location, null)[0] : null)
  const pri = a.family && a.support ? primersFor(calc, a.family, a.support)[0] : null
  const finColors = (colorSrc?.colors || []).map((c) => ({ ...c, ...effPrice(colorSrc, c) })).filter((c) => Number(c.price) > 0)
  const priOk = Boolean(pri && Number(pri.price) > 0)
  const finOk = finColors.length > 0
  const color = !custom ? finColors.find((c) => c.id === colorId) || null : null
  const cName = customName.trim() || customHex
  const customColor = custom && cName ? { name_fr: cName, name_ar: cName, hex: customHex || '#cccccc' } : null
  const hasColor = Boolean(color || customColor)
  const m2 = Number(area)

  const locs = a.family ? locationsFor(calc, a.family) : null
  const ths = a.family && a.location ? thicknessesFor(calc, a.family, a.location) : null
  const otherFam = a.family === 'epoxy' ? 'polyurethane' : 'epoxy'
  const offerOther = Boolean(calc && a.family && locs && !locs.includes('exterior') && locationsFor(calc, otherFam).includes('exterior'))

  const priRes = useMemo(() => (priOk && m2 > 0 ? calcMix(pri, pri, m2) : null), [pri, priOk, m2])
  // custom colour: quantities are computed, but no price (shown "sur demande", not in the total)
  const finRes = useMemo(() => (fin && hasColor && m2 > 0 ? calcMix(fin, color || { price: 0 }, m2) : null), [fin, color, hasColor, m2])

  const noMatch = Boolean(calc && answered && (!priOk || !fin))
  const ready = Boolean(answered && !noMatch && hasColor && priRes && finRes)
  const total = ready ? priRes.total + (customColor ? 0 : finRes.total) : 0
  const tool = a.thickness ? TOOL_OF[a.thickness] : null
  // from 200 m² the wholesale price applies (shown as a badge, never as a per-line price)
  const wholesale = Boolean(ready && (priRes?.tier === 'wholesale' || finRes?.tier === 'wholesale'))

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
      answers: { family: a.family, support: a.support, location: a.location, thickness: a.thickness, finish: fin?.slot, area: m2, color_id: color?.id, custom_color: customColor ? { name: customColor.name_fr, hex: customHex || '' } : undefined },
      info: { ...a, area: m2, tool, catalog: catalog || '', wholesale },
      lines: [lineOf(pri, null, priRes, 'primer'), lineOf(fin, customColor ? { ...customColor, custom: true } : color, finRes, 'finition')],
      total,
    })
    setOpen(true)
  }

  const askMsg = `${t('ask_msg')}${a.family ? t(`fam_${a.family}`) : ''} · ${a.support ? t(`surf_${a.support}`) : ''} · ${a.location ? t(`loc_${a.location}`) : ''} · ${a.thickness ? t(`th_${a.thickness}`) : ''}`

  const seg = (k, opts) => (
    <div className="pp-seg sol-seg">
      {opts.map(([v, label, sub, sub2, off]) => (
        <button key={v} type="button" disabled={off} className={a[k] === v ? 'on' : ''} aria-pressed={a[k] === v} onClick={() => set(k, v)}>
          <b>{label}</b>{sub && <small>{sub}</small>}
        </button>
      ))}
    </div>
  )

  // a line shows the product and the quantity only: the price is never detailed, only the total
  const Line = ({ role, p, c, res, onDemand }) => (
    <div className="sol-line">
      {p.image_url && <img className="sol-thumb" src={p.image_url} alt="" loading="lazy" />}
      <div className="sol-line-main">
        <span className={`role ${role === 'finition' ? 'fin' : ''}`}>{t(role === 'finition' ? 'role_finition' : 'role_primer')}</span>
        <b>{pick(p, 'name')}{c ? ` — ${pick(c, 'name')}` : ''}</b>
        {res
          ? <div className="sol-qp"><span className="q">{packsText(res.packs, t('kg'))} <em>({res.kg} {t('kg')})</em></span>{onDemand && <span className="pr od">{t('on_demand')}</span>}</div>
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
            {seg('family', ['epoxy', 'polyurethane'].map((f) => {
              const l = calc ? locationsFor(calc, f) : []
              return [f, t(`fam_${f}`), l.length === 2 ? t('where_both') : l[0] ? t(`where_${l[0]}`) : '', '', Boolean(calc) && l.length === 0]
            }))}
          </div>
          <div className="sol-row">
            <span className="pp-label">{t('f_surface')}</span>
            {seg('support', [['concrete', t('surf_concrete'), t('ex_concrete')], ['smooth', t('surf_smooth'), t('ex_smooth')]])}
          </div>
          <div className="sol-row">
            <span className="pp-label">{t('f_location')}</span>
            {seg('location', ['interior', 'exterior'].map((l) => { const off = Boolean(locs) && !locs.includes(l); return [l, t(`loc_${l}`), off ? t('not_available') : '', '', off] }))}
          </div>
          <div className="sol-row">
            <span className="pp-label">{t('f_thickness')}</span>
            <div>
              {seg('thickness', ['lt1', 'gt1'].map((th) => { const off = Boolean(ths) && !ths.includes(th); return [th, t(`th_${th}`), off ? t('not_available') : `🖌️ ${t(`tool_${TOOL_OF[th]}`)}`, '', off] }))}
              {tool && <div className="sol-note"><b>{t(`tool_${tool}_d`)}</b></div>}
              {catalog && <a className="sol-watch" href={catalog} target="_blank" rel="noreferrer"><Ico n="file" /> {t('view_catalog')} — {t(`tool_${tool}`)}</a>}
            </div>
          </div>
          {cands.length > 1 && (
            <div className="sol-row">
              <span className="pp-label">{t('f_product')}</span>
              <div className="pp-seg sol-seg">
                {cands.map((p) => (
                  <button key={p.slot} type="button" className={fin?.slot === p.slot ? 'on' : ''} aria-pressed={fin?.slot === p.slot} onClick={() => { setFinishSlot(p.slot); setColorId(null); setNeed(null) }}>
                    <b>{pick(p, 'name')}</b>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div id="sol-color" className={`sol-row ${need === 'color' ? 'need' : ''}`}>
            <span className="pp-label">{t('step_color')}{(customColor || color) && <em className="sol-cname"> · {pick(customColor || color, 'name')}</em>}</span>
            {!a.family || !a.location ? (
              <div className="sol-cprice"><span className="muted">{t('color_first')}</span></div>
            ) : (
              <div>
                <div className="sol-sw">
                  {finColors.map((c) => (
                    <button key={c.id} type="button" className={!custom && c.id === colorId ? 'on' : ''} onClick={() => { setColorId(c.id); setCustom(false); setNeed(null) }} aria-label={pick(c, 'name')} title={pick(c, 'name')}>
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
                        {!customHex && <span><Ico n="palette" size={18} /></span>}
                      </label>
                      <input type="text" maxLength={60} value={customName} placeholder={t('custom_ph')} onChange={(e) => { setCustomName(e.target.value); setNeed(null) }} />
                    </div>
                    <p className="sol-custom-note"><span className="sol-od-badge">{t('on_demand')}</span> {t('custom_note')}</p>
                  </div>
                ) : (
                  !color && <div className="sol-cprice"><span className="muted">{finOk ? t('pick_color') : t('custom_color')}</span></div>
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
                  <span><Ico n="brush" /> {t(`tool_${tool}_d`)}</span>
                </div>
                <div className="pp-total"><span>{t('total')}</span><b>{ready ? `${money(total)} ${t('currency')}` : '—'}</b></div>
                {wholesale && <p className="ws-badge"><span>{t('price_wholesale')}</span>{t('wholesale_note')}</p>}
                {customColor && <p className="sol-od-note">{t('od_total_note')}</p>}
                {m2 >= WHOLESALE_FROM && <a className="big-project" href={waLink(settings?.whatsapp, `${pick(fin, 'name')} — ${m2} ${t('m2')}`)} target="_blank" rel="noreferrer"><WaIcon size={18} /> {t('big_project')}</a>}
              </>
            )}
            {a.family && (
              <div className="sol-tip">
                <span><Ico n="bulb" /> {offerOther ? t('tip_ep') : t('tip_zones')}</span>
                {offerOther && <button type="button" onClick={() => set('family', otherFam)}>{t(`switch_${otherFam}`)}</button>}
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
