import HeroContent from './HeroContent'
import Icon from './Icon'

export default function Hero({ onUpcoming, onAbout }) {
  return (
    <section className="hero page-gutter" id="hero" aria-labelledby="hero-heading">
      <HeroContent onUpcoming={onUpcoming} />
      <footer className="hero-footer">
        <p className="disciplines"><span>DESIGN</span><span aria-hidden="true">×</span><span>LOGIC</span><span aria-hidden="true">×</span><span>DEVELOPMENT</span></p>
        <a className="scroll-link" href="#about" aria-label="Scroll to explore About" onClick={onAbout}><span>SCROLL TO EXPLORE</span><span className="scroll-link__icon"><Icon name="arrow-down" /></span></a>
      </footer>
    </section>
  )
}
