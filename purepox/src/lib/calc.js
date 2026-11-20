// kg needed = m² / (m² covered by 1 kg)
// buckets   = round up (kg / kg per bucket)
// price     = retail price (prix de détail) under 200 m², wholesale price (prix de gros) from 200 m²
//             (if a colour has no wholesale price, the retail price is used)
// total     = buckets × price
export const WHOLESALE_FROM = 200

export function calculate(product, color, m2) {
  const area = Number(m2)
  if (!product || !color || !area || area <= 0) return null
  const coverage = Number(product.coverage_m2_per_kg) || 0
  const bucketKg = Number(product.bucket_kg) || 0
  if (!coverage || !bucketKg) return null
  const kg = area / coverage
  const buckets = Math.ceil(kg / bucketKg - 1e-9)
  const retail = Number(color.price ?? product.base_price) || Number(product.base_price) || 0
  const wholesale = Number(color.price_wholesale) || 0
  const tier = area >= WHOLESALE_FROM && wholesale > 0 ? 'wholesale' : 'retail'
  const unitPrice = tier === 'wholesale' ? wholesale : retail
  return {
    area,
    kg: Math.ceil(kg * 100) / 100,
    buckets,
    bucketKg,
    tier,
    unitPrice,
    retail,
    wholesale,
    total: buckets * unitPrice,
  }
}

export const money = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ /g, ' ')

// ---------------------------------------------------------------------------------------------
// "Calculer mon besoin" — primer + finish. Shared by the site and the server (the server recomputes).
// Every product is a row managed in Admin → Calculateur (no more code changes to add a product):
//   role       'primer' | 'finition'
//   family     'epoxy' | 'polyurethane' | 'both'
//   support    (primers)  'concrete' | 'smooth' | 'both'
//   location   (finishes) 'interior' | 'exterior' | 'both'
//   thickness  (finishes) 'lt1' = Filmogène (roller) | 'gt1' = Autolissant (squeegee) | 'both'
//   colors_from (finishes) slot of another finish whose colours + prices are shared
//   kg needed  = m² / (m² covered by 1 kg)
//   packing    = as many big buckets (20 kg) as needed, the remainder in ONE small bucket (10 kg) if it fits
//   price      = big bucket price (per colour for finishes) · small bucket price
//   wholesale  = from 200 m²: the admin's wholesale price, otherwise retail price -5 %
// ---------------------------------------------------------------------------------------------
export const LAYERS = 2
export const WHOLESALE_DISCOUNT = 0.05
export const TOOL_OF = { lt1: 'roller', gt1: 'squeegee' }
export const layersOf = (thickness) => (thickness === 'lt1' ? LAYERS : null)

export const FAMILIES = ['epoxy', 'polyurethane']
export const SUPPORTS = ['concrete', 'smooth']
export const LOCATIONS = ['interior', 'exterior']
export const THICKNESSES = ['lt1', 'gt1']

const isOn = (p) => p && p.active !== false && Number(p.active) !== 0
const fits = (v, want) => !v || v === 'both' || v === 'any' || !want || v === want
const exact = (v, want) => (v && v !== 'both' && v !== 'any' && v === want ? 0 : 1)

// all active products, in the admin's order
export const productList = (calc) => Object.values(calc || {}).filter(isOn).sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))

// price of a colour = its own price if set, otherwise the finish product's bucket price (same for small / wholesale)
export function effPrice(slot, color) {
  const pick = (k) => (Number(color?.[k]) > 0 ? Number(color[k]) : Number(slot?.[k]) > 0 ? Number(slot[k]) : null)
  return { price: pick('price'), price_small: pick('price_small'), price_wholesale: pick('price_wholesale') }
}

// finish with at least one priced colour
export const finishReady = (p) => (p.colors || []).some((c) => Number(effPrice(p, c).price) > 0)

// primers that fit the family + support (most specific first). Primers need a price.
export function primersFor(calc, family, support) {
  return productList(calc)
    .filter((p) => p.role === 'primer' && Number(p.price) > 0 && fits(p.family, family) && fits(p.support, support))
    .sort((a, b) => exact(a.family, family) + exact(a.support, support) - (exact(b.family, family) + exact(b.support, support)))
}

// finishes that fit family + location (+ thickness when given). Keep only the ones the client can really buy.
export function finishesFor(calc, family, location, thickness) {
  return productList(calc).filter((p) => p.role === 'finition' && finishReady(p) && fits(p.family, family) && fits(p.location, location) && fits(p.thickness, thickness))
}

// what exists for a family: used to disable the choices that have no product
export const locationsFor = (calc, family) => LOCATIONS.filter((l) => finishesFor(calc, family, l, null).length > 0)
export const thicknessesFor = (calc, family, location) => THICKNESSES.filter((th) => finishesFor(calc, family, location, th).length > 0)

// slot = a calc product (bucket_kg, small_kg, coverage_m2_per_kg), price = { price, price_small, price_wholesale }
export function calcMix(slot, price, m2) {
  const area = Number(m2)
  if (!slot || !price || !(area > 0)) return null
  const cov = Number(slot.coverage_m2_per_kg) || 0
  const big = Number(slot.bucket_kg) || 0
  const small = Number(slot.small_kg) || 0
  if (!cov || !big) return null

  const need = area / cov
  let nBig = Math.floor(need / big + 1e-9)
  const rest = need - nBig * big
  let nSmall = 0
  if (rest > 1e-6) { if (small > 0 && rest <= small + 1e-6) nSmall = 1; else nBig += 1 }

  const retail = Number(price.price) || 0
  const wholesale = Number(price.price_wholesale) > 0 ? Number(price.price_wholesale) : Math.round(retail * (1 - WHOLESALE_DISCOUNT))
  const tier = area >= WHOLESALE_FROM && wholesale > 0 ? 'wholesale' : 'retail'
  const pBig = tier === 'wholesale' ? wholesale : retail
  const pSmall = small > 0
    ? Math.round(tier === 'wholesale' ? (wholesale * small) / big : (Number(price.price_small) || (retail * small) / big))
    : 0
  const packs = []
  if (nBig) packs.push({ kg: big, n: nBig, price: pBig })
  if (nSmall) packs.push({ kg: small, n: nSmall, price: pSmall })
  return {
    area, tier, packs,
    kg: Math.ceil(need * 100) / 100,
    kgBought: nBig * big + nSmall * small,
    total: nBig * pBig + nSmall * pSmall,
  }
}

export const packsText = (packs, unit = 'kg') => (packs || []).map((p) => (p.kg ? `${p.n} × ${p.kg} ${unit}` : `${p.n}`)).join(' + ')
