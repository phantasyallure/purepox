// Finds the closest colour name (French + Arabic) for any hex value — no typing needed.
export const PALETTE = [
  ['Blanc', 'أبيض', '#FFFFFF'], ['Crème', 'كريمي', '#F5EBD7'], ['Beige', 'بيج', '#D8C3A5'], ['Sable', 'رملي', '#C2B280'],
  ['Jaune', 'أصفر', '#F2C200'], ['Or', 'ذهبي', '#D4A017'], ['Orange', 'برتقالي', '#EC6B14'], ['Terracotta', 'تيراكوتا', '#C8643C'],
  ['Saumon', 'سلموني', '#F4A28C'], ['Rouge', 'أحمر', '#D32F2F'], ['Bordeaux', 'أحمر عنابي', '#7B1E2B'], ['Rose', 'وردي', '#F48FB1'],
  ['Fuchsia', 'فوشيا', '#C2185B'], ['Violet', 'بنفسجي', '#6A3FA0'], ['Lilas', 'ليلكي', '#C3A6E0'], ['Bleu marine', 'أزرق داكن', '#14284B'],
  ['Bleu', 'أزرق', '#1E5BC6'], ['Bleu ciel', 'أزرق سماوي', '#7EC8F0'], ['Turquoise', 'فيروزي', '#1BB5B0'], ['Menthe', 'نعناعي', '#A8E6CF'],
  ['Vert clair', 'أخضر فاتح', '#8BC34A'], ['Vert', 'أخضر', '#2E9E4F'], ['Vert foncé', 'أخضر داكن', '#1B5E3A'], ['Olive', 'زيتوني', '#6B7A2A'],
  ['Kaki', 'كاكي', '#8A8456'], ['Marron', 'بني', '#7A4A28'], ['Chocolat', 'بني داكن', '#3E2418'], ['Gris perle', 'رمادي لؤلؤي', '#D3D6DA'],
  ['Gris clair', 'رمادي فاتح', '#BDBDBD'], ['Gris béton', 'رمادي إسمنتي', '#9AA0A6'], ['Gris', 'رمادي', '#757575'], ['Anthracite', 'أنثراسيت', '#3A3D42'],
  ['Noir', 'أسود', '#111111'],
]

// the swatches offered when adding a colour
export const PRESETS = ['Blanc', 'Noir', 'Gris clair', 'Gris béton', 'Anthracite', 'Beige', 'Sable', 'Marron', 'Rouge', 'Bordeaux', 'Orange', 'Jaune', 'Vert', 'Vert foncé', 'Turquoise', 'Bleu', 'Bleu marine', 'Bleu ciel']
  .map((n) => PALETTE.find((p) => p[0] === n))

function toLab(hex) {
  const n = parseInt(hex.slice(1), 16)
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255)
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}
const LABS = PALETTE.map((p) => toLab(p[2]))

export function colorName(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex || '')) return { fr: 'Couleur', ar: 'لون' }
  const [l, a, b] = toLab(hex)
  let best = 0, bd = Infinity
  LABS.forEach((c, i) => {
    const d = (c[0] - l) ** 2 + (c[1] - a) ** 2 + (c[2] - b) ** 2
    if (d < bd) { bd = d; best = i }
  })
  return { fr: PALETTE[best][0], ar: PALETTE[best][1] }
}
