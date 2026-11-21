import { useState } from 'react'

// Product photo that always shows the WHOLE picture (no cropping), on any phone or screen:
// a soft blurred copy fills the frame behind it, the sharp photo sits on top with object-fit: contain.
// While it loads a light shimmer is shown; if the file cannot be loaded, `fallback` is shown instead.
export default function Photo({ src, alt = '', eager = false, fallback = null, className = '' }) {
  const [state, setState] = useState('loading') // loading | ok | err
  if (!src || state === 'err') return fallback
  return (
    <span className={`ph ${state === 'ok' ? 'ready' : ''} ${className}`} style={{ '--ph-src': `url("${src}")` }}>
      <img
        className="ph-fg"
        src={src}
        alt={alt}
        decoding="async"
        loading={eager ? 'eager' : 'lazy'}
        fetchpriority={eager ? 'high' : undefined}
        onLoad={() => setState('ok')}
        onError={() => setState('err')}
      />
    </span>
  )
}
