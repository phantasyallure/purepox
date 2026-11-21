// Used only when Supabase env vars are missing, so the site can be previewed.
export const demoProducts = [
  {
    id: 'demo-1', name_fr: 'Époxy Sol Brillant', name_ar: 'إيبوكسي أرضيات لامع',
    desc_fr: 'Revêtement de sol époxy brillant, haute résistance, idéal pour garages, ateliers et locaux commerciaux.',
    desc_ar: 'طلاء أرضيات إيبوكسي لامع عالي المقاومة، مثالي للمرائب والورشات والمحلات التجارية.',
    bucket_kg: 20, coverage_m2_per_kg: 0.4, base_price: 28000, active: true, sort_order: 1,
    colors: [
      { id: 'c1', name_fr: 'Gris Béton', name_ar: 'رمادي إسمنتي', hex: '#9aa0a6', price: 28000 },
      { id: 'c2', name_fr: 'Noir', name_ar: 'أسود', hex: '#161616', price: 29500 },
      { id: 'c3', name_fr: 'Orange Purepox', name_ar: 'برتقالي بيوربوكس', hex: '#ec6b14', price: 31000 },
      { id: 'c4', name_fr: 'Blanc', name_ar: 'أبيض', hex: '#f1f1f1', price: 28000 },
    ],
  },
  {
    id: 'demo-2', name_fr: 'Époxy Autolissant 3D', name_ar: 'إيبوكسي ذاتي التسوية 3D',
    desc_fr: 'Finition lisse et continue, parfaite pour showrooms, salons et espaces design.',
    desc_ar: 'تشطيب أملس ومتواصل، مثالي لصالات العرض والصالونات والمساحات العصرية.',
    bucket_kg: 25, coverage_m2_per_kg: 0.25, base_price: 42000, active: true, sort_order: 2,
    colors: [
      { id: 'c5', name_fr: 'Gris Perle', name_ar: 'رمادي لؤلؤي', hex: '#c9ccd1', price: 45000 },
      { id: 'c6', name_fr: 'Anthracite', name_ar: 'أنثراسيت', hex: '#3a3d42', price: 46500 },
      { id: 'c7', name_fr: 'Beige Sable', name_ar: 'بيج رملي', hex: '#d8c3a5', price: 45000 },
    ],
  },
]

export const demoSettings = {
  phone: '0X XX XX XX XX', phone2: '', email: 'contact@purepox.dz', whatsapp: '',
  facebook: '', instagram: '',
  address_fr: 'Algérie', address_ar: 'الجزائر',
  hours_fr: 'Sam – Jeu : 08h – 17h', hours_ar: 'السبت – الخميس : 08:00 – 17:00',
}
