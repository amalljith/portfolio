import Icon from './Icon'

export default function Button({ children, href, variant = 'primary', unavailable = false, onClick }) {
  return (
    <a className={`cta cta--${variant}`} href={href} aria-disabled={unavailable || undefined} title={unavailable ? 'Coming soon' : undefined} onClick={onClick}>
      <span className="cta__label">{children}</span>
      <span className="cta__arrow" aria-hidden="true">
        <Icon className="cta__icon cta__icon--out" />
        <Icon className="cta__icon cta__icon--in" />
      </span>
    </a>
  )
}
