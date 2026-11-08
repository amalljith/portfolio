import { useRef } from 'react'
import HybridText from '../HybridText'
import AboutProfile from './AboutProfile'
import useAboutMotion from '../../hooks/useAboutMotion'
import './about.css'

const PRINCIPLES = [
  ['01', 'DESIGN WITH INTENT', 'Clear hierarchy. Considered interactions.'],
  ['02', 'BUILD WITH LOGIC', 'Connecting the interface with the thinking behind it.'],
  ['03', 'MOVE WITH PURPOSE', 'The details that make an experience feel different.'],
]

export default function AboutSection({ enabled }) {
  const rootRef = useRef(null)
  useAboutMotion(rootRef, enabled)

  return (
    <section ref={rootRef} className="about page-gutter" id="about" data-aurora-section="about" aria-labelledby="about-heading" tabIndex={-1}>
      <header className="about__header">
        <div>
          <p className="about__eyebrow"><span>01 /</span> A LITTLE CONTEXT</p>
          <div className="about__title-mask"><h2 id="about-heading"><HybridText text="ABOUT" pixelIndices={[0, 4]} /></h2></div>
        </div>
        <p className="about__margin-note">THE PERSON<br />BEHIND THE CODE <span aria-hidden="true">↙</span></p>
      </header>
      <div className="about__rule" aria-hidden="true" />
      <div className="about__body">
        <div className="about__editorial">
          <p className="about__statement">At the intersection of design and development.</p>
          <div className="about__copy about__reveal">
            <p>I’m Amal Jith, a full stack developer turning ideas into digital experiences.</p>
            <p>From the first interaction to the last detail, I care about how an experience looks, feels, and works. Thoughtful design, clear logic, and purposeful motion bring it all together.</p>
          </div>
        </div>
        <AboutProfile />
      </div>
      <div className="about__principles" aria-label="How I work">
        {PRINCIPLES.map(([number, title, description]) => (
          <article className="about__principle about__reveal" key={number}>
            <span className="about__principle-number" aria-hidden="true">{number}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <div className="about__colophon"><span>DESIGN IS THE FEELING.</span><span>DEVELOPMENT MAKES IT REAL. <i aria-hidden="true" /></span></div>
    </section>
  )
}
