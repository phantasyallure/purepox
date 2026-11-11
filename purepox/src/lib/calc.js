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
//   kg needed  = m² / (m² covered by 1 kg)         primer: 100 m² = 20 kg · finish: 50 m² = 20 kg (2 layers)
//   packing    = as many big buckets (20 kg) as needed, the remainder in ONE small bucket (10 kg) if it fits
//   price      = big bucket price (per colour for the finish) · small bucket price · wholesale from 200 m²
// ---------------------------------------------------------------------------------------------
export const LAYERS = 2
export const TOOL_OF = { lt1: 'roller', gt1: 'squeegee' }

export const SLOTS = {
  primer_normal: { role: 'primer', fr: 'Primaire normal', ar: 'برايمر عادي', coverage: 5 },
  primer_traite: { role: 'primer', fr: 'Primaire traité', ar: 'برايمر معالج', coverage: 5 },
  epoxy: { role: 'finition', fr: 'Finition Époxy', ar: 'تشطيب إيبوكسي', coverage: 2.5 },
  polyurethane: { role: 'finition', fr: 'Finition Polyuréthane', ar: 'تشطيب بولي يوريثان', coverage: 2.5 },
}
export const primerSlot = (support) => (support === 'concrete' ? 'primer_normal' : 'primer_traite')

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
  const wholesale = Number(price.price_wholesale) || 0
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
