import Icon from './Icon'
import { useRef } from 'react'
import { useMagneticCTA } from '../hooks/useMagneticCTA'

export default function Button({ children, href, variant = 'primary', unavailable = false, onClick }) {
  const wrapperRef = useRef(null)
  useMagneticCTA(wrapperRef)
  return (
    <span className="magnetic-cta" ref={wrapperRef}>
      <a className={`cta cta--${variant}`} href={href} aria-disabled={unavailable || undefined} title={unavailable ? 'Coming soon' : undefined} onClick={onClick}>
        <span className="cta__label">{children}</span>
        <span className="cta__arrow" aria-hidden="true">
          <Icon className="cta__icon cta__icon--out" />
          <Icon className="cta__icon cta__icon--in" />
        </span>
      </a>
    </span>
  )
}
