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
