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
  phone: '0X XX XX XX XX', phone2: '', email: 'contact@decodz.dz', whatsapp: '',
  facebook: '', instagram: '', catalog_roller: '', catalog_squeegee: '',
  address_fr: 'Algérie', address_ar: 'الجزائر',
  hours_fr: 'Sam – Jeu : 08h – 17h', hours_ar: 'السبت – الخميس : 08:00 – 17:00',
}

// rules: family / support (primers) / location + thickness (finishes). Same shape as the API (Admin → Calculateur).
const P = (slot, fr, ar, role, rules, cov, price, price_small, colors, extra) => ({ slot, role, active: true, sort_order: 0, name_fr: fr, name_ar: ar, image_url: '', bucket_kg: 20, small_kg: 10, coverage_m2_per_kg: cov, price, price_small, price_wholesale: null, colors: colors || [], ...rules, ...extra })
const E = [{ id: 'e1', name_fr: 'RAL 7035', name_ar: 'RAL 7035', hex: '#cbd0cc', price: 44000 }, { id: 'e2', name_fr: 'RAL 5012', name_ar: 'RAL 5012', hex: '#0089b6', price: 55000 }]
const U = [{ id: 'p1', name_fr: 'Blanc', name_ar: 'أبيض', hex: '#f4f4f4', price: 42000 }, { id: 'p2', name_fr: 'RAL 7035', name_ar: 'RAL 7035', hex: '#cbd0cc', price: 39500 }]
const X = [{ id: 'x1', name_fr: 'RAL 7035', name_ar: 'RAL 7035', hex: '#cbd0cc', price: 49000 }, { id: 'x2', name_fr: 'Noir', name_ar: 'أسود', hex: '#161616', price: 64000 }]
export const demoCalc = Object.fromEntries([
  P('primer_epoxy_normal', 'Primaire Époxy Normal', 'برايمر إيبوكسي عادي', 'primer', { family: 'epoxy', support: 'concrete' }, 5, 37000, 19000, [], { sort_order: 1 }),
  P('primer_epoxy_traite', 'Primaire Époxy Traité', 'برايمر إيبوكسي معالج', 'primer', { family: 'epoxy', support: 'smooth' }, 5, 42000, 22000, [], { sort_order: 2 }),
  P('primer_pu_normal', 'Primaire Polyuréthane Normal', 'برايمر بولي يوريثان عادي', 'primer', { family: 'polyurethane', support: 'concrete' }, 5, 32000, 17000, [], { sort_order: 3 }),
  P('primer_pu_traite', 'Primaire Polyuréthane Traité', 'برايمر بولي يوريثان معالج', 'primer', { family: 'polyurethane', support: 'smooth' }, 5, 37000, 19000, [], { sort_order: 4 }),
  P('epoxy', 'Finition Époxy Filmogène', 'تشطيب إيبوكسي غشائي', 'finition', { family: 'epoxy', location: 'interior', thickness: 'lt1' }, 2.5, null, null, E, { sort_order: 10 }),
  P('epoxy_raclette', 'Finition Époxy Autolissant', 'تشطيب إيبوكسي ذاتي التسوية', 'finition', { family: 'epoxy', location: 'interior', thickness: 'gt1' }, 0.75, null, null, E, { sort_order: 11, colorsFrom: 'epoxy' }),
  P('polyurethane', 'Finition Polyuréthane Standard', 'تشطيب بولي يوريثان عادي', 'finition', { family: 'polyurethane', location: 'interior', thickness: 'lt1' }, 2.5, null, null, U, { sort_order: 20 }),
  P('polyurethane_raclette', 'Finition Polyuréthane Autolissant', 'تشطيب بولي يوريثان ذاتي التسوية', 'finition', { family: 'polyurethane', location: 'interior', thickness: 'gt1' }, 0.75, null, null, U, { sort_order: 21, colorsFrom: 'polyurethane' }),
  P('polyurethane_ext', 'Finition Polyuréthane Anti-UV Extérieur', 'تشطيب بولي يوريثان مضاد للأشعة خارجي', 'finition', { family: 'polyurethane', location: 'exterior', thickness: 'lt1' }, 2.5, null, null, X, { sort_order: 30 }),
].map((d) => [d.slot, d]))
