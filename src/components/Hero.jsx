import HeroContent from './HeroContent'
import Icon from './Icon'

export default function Hero({ onUpcoming }) {
  return (
    <main className="hero page-gutter" id="main" aria-labelledby="hero-heading" tabIndex={-1}>
      <HeroContent onUpcoming={onUpcoming} />
      <footer className="hero-footer">
        <p className="disciplines"><span>DESIGN</span><span aria-hidden="true">×</span><span>LOGIC</span><span aria-hidden="true">×</span><span>DEVELOPMENT</span></p>
        <a className="scroll-link" href="#work" aria-disabled="true" aria-label="Scroll to explore — selected work coming soon" title="Selected work — coming soon" onClick={(event) => onUpcoming(event, 'Selected work')}><span>SCROLL TO EXPLORE</span><span className="scroll-link__icon"><Icon name="arrow-down" /></span></a>
      </footer>
    </main>
  )
}
