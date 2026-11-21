// kg needed = m² / (m² covered by 1 kg)
// buckets   = round up (kg / kg per bucket)
// total     = buckets × price of the chosen color (falls back to the product base price)
export function calculate(product, color, m2) {
  const area = Number(m2)
  if (!product || !color || !area || area <= 0) return null
  const coverage = Number(product.coverage_m2_per_kg) || 0
  const bucketKg = Number(product.bucket_kg) || 0
  if (!coverage || !bucketKg) return null
  const kg = area / coverage
  const buckets = Math.ceil(kg / bucketKg - 1e-9)
  const unitPrice = Number(color.price ?? product.base_price) || Number(product.base_price) || 0
  return {
    area,
    kg: Math.ceil(kg * 100) / 100,
    buckets,
    bucketKg,
    unitPrice,
    total: buckets * unitPrice,
  }
}

export const money = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ /g, ' ')
