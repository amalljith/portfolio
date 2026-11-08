import Button from './Button'
import HybridText from './HybridText'
import HeroHeading from './HeroHeading'

export default function HeroContent({ onUpcoming }) {
  return (
    <div className="hero-content">
      <div className="hero-identity">
        <p className="hero-name"><HybridText text="AMAL JITH" pixelIndices={[2]} /></p>
        <span className="identity-divider" aria-hidden="true">/</span>
        <p className="hero-role">FULL STACK<br className="role-break" /> DEVELOPER</p>
      </div>
      <div className="headline-wrap">
        <div className="headline-orbit" aria-hidden="true"><span /></div>
        <HeroHeading />
      </div>
      <p className="hero-description">Creating digital experiences<br />that move beyond ordinary.</p>
      <div className="hero-ctas">
        <Button href="#work" unavailable onClick={(event) => onUpcoming(event, 'Selected work')}>EXPLORE WORK</Button>
        <Button href="#contact" variant="secondary" unavailable onClick={(event) => onUpcoming(event, 'Contact')}>LET’S CONNECT</Button>
      </div>
    </div>
  )
}
