import { useLang } from '../lib/i18n'

// small badges describing a product: surface · location · thickness
export default function Tags({ p }) {
  const { t } = useLang()
  const surf = p.surface === 'both' ? t('both_surface') : t(`surf_${p.surface}`)
  const loc = p.location === 'both' ? t('both') : t(`loc_${p.location}`)
  const th = t(`th_${p.thickness}`)
  return (
    <div className="tags">
      <span>{surf}</span><span>{loc}</span><span>{th}</span>
    </div>
  )
}
