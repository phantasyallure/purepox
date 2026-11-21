import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const dict = {
  fr: {
    nav_products: 'Produits', nav_how: 'Comment ça marche', nav_about: 'À propos', nav_contact: 'Contact',
    order_btn: 'Commander', cart: 'Ma commande',
    hero_kicker: 'Revêtements de sol époxy',
    hero_title: 'Des sols qui brillent. Qui durent.',
    hero_sub: 'Choisissez votre résine, votre couleur, entrez votre surface : on calcule les kilos et le prix en temps réel.',
    hero_cta: 'Voir les produits', hero_cta2: 'Comment ça marche',
    products_title: 'Nos produits', products_sub: 'Cliquez sur un produit pour choisir sa couleur et calculer votre besoin.',
    from: 'À partir de', per_bucket: 'le seau', colors_n: 'couleurs', view: 'Découvrir',
    how_title: 'Comment ça marche',
    how_1_t: 'Choisissez un produit', how_1_d: 'Parcourez la gamme et ouvrez la fiche du produit qui vous convient.',
    how_2_t: 'Sélectionnez la couleur', how_2_d: 'Chaque couleur a son propre prix, affiché clairement.',
    how_3_t: 'Entrez votre surface', how_3_d: 'Saisissez les m² : nous calculons les kilos nécessaires et le nombre de seaux.',
    how_4_t: 'Commandez', how_4_d: 'Laissez votre nom et téléphone, nous vous rappelons pour confirmer.',
    about_title: 'Pourquoi Purepox',
    about_p: 'Purepox propose des résines et revêtements de sol époxy performants pour le résidentiel, le commercial et l\'industriel. Surfaces durables, faciles d\'entretien, finition impeccable.',
    about_1: 'Haute résistance', about_2: 'Finition impeccable', about_3: 'Large choix de couleurs', about_4: 'Conseil & accompagnement',
    contact_title: 'Contactez-nous', phone: 'Téléphone', email: 'Email', address: 'Adresse', hours: 'Horaires',
    footer_rights: 'Tous droits réservés.', footer_links: 'Liens rapides',
    back: '← Retour aux produits', color: 'Couleur', price_bucket: 'Prix par seau',
    calc_title: 'Calculez votre besoin', surface: 'Surface (m²)', surface_ph: 'Ex : 40',
    need_kg: 'Quantité nécessaire', buckets: 'Nombre de seaux', bucket_size: 'Contenance du seau',
    total: 'Total', coverage: 'Rendement', kg: 'kg', m2: 'm²', per_kg: 'm² par kg',
    enter_area: 'Entrez une surface pour voir la quantité et le prix.',
    add_more: 'Ajouter et continuer', no_color: 'Choisissez une couleur',
    your_order: 'Votre commande', empty_cart: 'Votre commande est vide.',
    full_name: 'Nom complet', phone_field: 'Numéro de téléphone', submit: 'Valider la commande',
    sending: 'Envoi…', done_t: 'Commande envoyée !', done_d: 'Merci. Nous vous contacterons très vite pour confirmer.',
    close: 'Fermer', remove: 'Retirer', err_fields: 'Veuillez entrer un nom et un numéro de téléphone valides.',
    err_send: 'Erreur d\'envoi. Réessayez ou appelez-nous.', loading: 'Chargement…', none: 'Aucun produit pour le moment.',
    currency: 'DA', buckets_short: 'seau(x)', call_us: 'Appelez-nous',
  },
  ar: {
    nav_products: 'المنتجات', nav_how: 'كيف يعمل', nav_about: 'من نحن', nav_contact: 'اتصل بنا',
    order_btn: 'اطلب الآن', cart: 'طلبي',
    hero_kicker: 'طلاء أرضيات الإيبوكسي',
    hero_title: 'أرضيات تلمع. وتدوم.',
    hero_sub: 'اختر المنتج واللون وأدخل مساحتك: نحسب لك الكمية بالكيلوغرام والسعر فوراً.',
    hero_cta: 'شاهد المنتجات', hero_cta2: 'كيف يعمل',
    products_title: 'منتجاتنا', products_sub: 'اضغط على المنتج لاختيار اللون وحساب الكمية التي تحتاجها.',
    from: 'ابتداءً من', per_bucket: 'للدلو', colors_n: 'ألوان', view: 'اكتشف',
    how_title: 'كيف يعمل',
    how_1_t: 'اختر المنتج', how_1_d: 'تصفح المجموعة وافتح صفحة المنتج المناسب.',
    how_2_t: 'اختر اللون', how_2_d: 'لكل لون سعره الخاص ويظهر بوضوح.',
    how_3_t: 'أدخل المساحة', how_3_d: 'أدخل المتر المربع ونحسب لك الكيلوغرامات وعدد الدلاء.',
    how_4_t: 'اطلب', how_4_d: 'اترك اسمك ورقم هاتفك وسنتصل بك لتأكيد الطلب.',
    about_title: 'لماذا بيوربوكس',
    about_p: 'تقدم بيوربوكس راتنجات وطلاءات أرضيات إيبوكسي عالية الأداء للاستعمال السكني والتجاري والصناعي. أسطح متينة وسهلة التنظيف وتشطيب مثالي.',
    about_1: 'مقاومة عالية', about_2: 'تشطيب مثالي', about_3: 'ألوان متنوعة', about_4: 'نصيحة ومرافقة',
    contact_title: 'اتصل بنا', phone: 'الهاتف', email: 'البريد الإلكتروني', address: 'العنوان', hours: 'أوقات العمل',
    footer_rights: 'جميع الحقوق محفوظة.', footer_links: 'روابط سريعة',
    back: 'العودة إلى المنتجات ←', color: 'اللون', price_bucket: 'سعر الدلو',
    calc_title: 'احسب احتياجك', surface: 'المساحة (م²)', surface_ph: 'مثال: 40',
    need_kg: 'الكمية اللازمة', buckets: 'عدد الدلاء', bucket_size: 'سعة الدلو',
    total: 'المجموع', coverage: 'التغطية', kg: 'كغ', m2: 'م²', per_kg: 'م² لكل كغ',
    enter_area: 'أدخل المساحة لمعرفة الكمية والسعر.',
    add_more: 'أضف واستمر', no_color: 'اختر لوناً',
    your_order: 'طلبك', empty_cart: 'طلبك فارغ.',
    full_name: 'الاسم الكامل', phone_field: 'رقم الهاتف', submit: 'تأكيد الطلب',
    sending: 'جارٍ الإرسال…', done_t: 'تم إرسال الطلب!', done_d: 'شكراً لك. سنتصل بك قريباً جداً لتأكيد الطلب.',
    close: 'إغلاق', remove: 'حذف', err_fields: 'يرجى إدخال اسم ورقم هاتف صحيحين.',
    err_send: 'حدث خطأ في الإرسال. حاول مرة أخرى أو اتصل بنا.', loading: 'جارٍ التحميل…', none: 'لا توجد منتجات حالياً.',
    currency: 'دج', buckets_short: 'دلو', call_us: 'اتصل بنا',
  },
}

const Ctx = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('purepox_lang') || 'fr' } catch { return 'fr' }
  })
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    try { localStorage.setItem('purepox_lang', lang) } catch { /* ignore */ }
  }, [lang])
  const t = useCallback((k) => dict[lang][k] ?? k, [lang])
  // pick a localized field: pick(obj,'name') -> name_fr / name_ar (fallback to fr)
  const pick = useCallback((o, f) => (o ? (lang === 'ar' && o[`${f}_ar`]) || o[`${f}_fr`] || '' : ''), [lang])
  return <Ctx.Provider value={{ lang, setLang, t, pick }}>{children}</Ctx.Provider>
}

export const useLang = () => useContext(Ctx)
