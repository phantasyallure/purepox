// Used only when the API is missing (vite dev / VITE_DEMO), so the site can be previewed.
const C = (id, fr, ar, hex, price, ws) => ({ id, name_fr: fr, name_ar: ar, hex, price, price_wholesale: ws })
export const demoProducts = [
  {
    id: 'demo-1', name_fr: 'Époxy Sol Brillant', name_ar: 'إيبوكسي أرضيات لامع',
    desc_fr: 'Revêtement de sol époxy brillant, haute résistance, idéal pour garages, ateliers et locaux commerciaux.',
    desc_ar: 'طلاء أرضيات إيبوكسي لامع عالي المقاومة، مثالي للمرائب والورشات والمحلات التجارية.',
    role: 'finition', family: 'epoxy', surface: 'concrete', location: 'interior', thickness: 'lt1',
    bucket_kg: 20, coverage_m2_per_kg: 0.4, base_price: 28000, active: true, sort_order: 1,
    colors: [
      C('c1', 'Gris Béton', 'رمادي إسمنتي', '#9aa0a6', 28000, 25000), C('c2', 'Noir', 'أسود', '#161616', 29500, 26500),
      C('c3', 'Orange', 'برتقالي', '#ec6b14', 31000, 28000), C('c4', 'Blanc', 'أبيض', '#f1f1f1', 28000, 25000),
      C('c8', 'Beige', 'بيج', '#d8c3a5', 28500, 25500), C('c9', 'Bleu', 'أزرق', '#1e5bc6', 30000, 27000),
      C('c10', 'Vert', 'أخضر', '#2e9e4f', 30000, 27000),
    ],
  },
  {
    id: 'demo-2', name_fr: 'Époxy Autolissant 3D', name_ar: 'إيبوكسي ذاتي التسوية 3D',
    desc_fr: 'Finition lisse et continue, parfaite pour showrooms, salons et espaces design.',
    desc_ar: 'تشطيب أملس ومتواصل، مثالي لصالات العرض والصالونات والمساحات العصرية.',
    role: 'finition', family: 'epoxy', surface: 'smooth', location: 'interior', thickness: 'gt1',
    bucket_kg: 25, coverage_m2_per_kg: 0.25, base_price: 42000, active: true, sort_order: 2,
    colors: [
      C('c5', 'Gris Perle', 'رمادي لؤلؤي', '#c9ccd1', 45000, 41000), C('c6', 'Anthracite', 'أنثراسيت', '#3a3d42', 46500, 42500),
      C('c7', 'Beige Sable', 'بيج رملي', '#d8c3a5', 45000, 41000),
    ],
  },
  {
    id: 'demo-3', name_fr: 'Polyuréthane Extérieur', name_ar: 'بولي يوريثان خارجي',
    desc_fr: 'Finition polyuréthane résistante aux UV et aux intempéries, pour terrasses, parkings et surfaces extérieures.',
    desc_ar: 'تشطيب بولي يوريثان مقاوم للأشعة فوق البنفسجية والعوامل الجوية، للشرفات والمواقف والأسطح الخارجية.',
    role: 'finition', family: 'polyurethane', surface: 'both', location: 'both', thickness: 'both',
    bucket_kg: 20, coverage_m2_per_kg: 0.2, base_price: 36000, active: true, sort_order: 3,
    colors: [
      C('c11', 'Gris Clair', 'رمادي فاتح', '#bdbdbd', 36000, 32500), C('c12', 'Anthracite', 'أنثراسيت', '#3a3d42', 37500, 34000),
      C('c13', 'Blanc', 'أبيض', '#f1f1f1', 36000, 32500),
    ],
  },
  {
    id: 'demo-4', name_fr: 'Primaire Époxy Universel', name_ar: 'برايمر إيبوكسي شامل',
    desc_fr: 'Primaire d’accrochage pour béton et surfaces lisses.', desc_ar: 'برايمر تحضير للخرسانة والأسطح الملساء.',
    role: 'primer', family: 'epoxy', surface: 'both', location: 'both', thickness: 'both',
    bucket_kg: 10, coverage_m2_per_kg: 0.2, base_price: 14000, active: true, sort_order: 0,
    colors: [C('c14', 'Transparent', 'شفاف', '#e8e4dc', 14000, 12500)],
  },
]

export const demoSettings = {
  phone: '0X XX XX XX XX', phone2: '', email: 'contact@purepox.dz', whatsapp: '',
  facebook: '', instagram: '', catalog_concrete: '', catalog_smooth: '',
  address_fr: 'Algérie', address_ar: 'الجزائر',
  hours_fr: 'Sam – Jeu : 08h – 17h', hours_ar: 'السبت – الخميس : 08:00 – 17:00',
}

const slot = (slot, fr, ar, cov, price, colors) => ({ slot, name_fr: fr, name_ar: ar, image_url: '', bucket_kg: 20, small_kg: 10, coverage_m2_per_kg: cov, price, price_small: null, price_wholesale: null, colors: colors || [] })
export const demoCalc = {
  primer_normal: slot('primer_normal', 'Primaire normal', 'برايمر عادي', 5, 18000),
  primer_traite: slot('primer_traite', 'Primaire traité', 'برايمر معالج', 5, 24000),
  epoxy: slot('epoxy', 'Finition Époxy', 'تشطيب إيبوكسي', 2.5, 0, [
    { id: 'e1', name_fr: 'Gris béton', name_ar: 'رمادي إسمنتي', hex: '#9aa0a6', price: 28000 }, { id: 'e2', name_fr: 'Noir', name_ar: 'أسود', hex: '#161616', price: 29500 },
    { id: 'e3', name_fr: 'Orange', name_ar: 'برتقالي', hex: '#ec6b14', price: 31000 },
  ]),
  polyurethane: slot('polyurethane', 'Finition Polyuréthane', 'تشطيب بولي يوريثان', 2.5, 0, [
    { id: 'p1', name_fr: 'Blanc', name_ar: 'أبيض', hex: '#f1f1f1', price: 34000 }, { id: 'p2', name_fr: 'Anthracite', name_ar: 'أنثراسيت', hex: '#3a3d42', price: 36000 },
  ]),
}
