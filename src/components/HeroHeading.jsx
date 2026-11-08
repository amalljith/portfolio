import HybridText from './HybridText'

export default function HeroHeading() {
  return (
    <h1 id="hero-heading" aria-label="IDEAS INTO MOTION.">
      <span className="headline-line" aria-hidden="true"><HybridText text="IDEAS INTO" pixelIndices={[4, 9]} /></span>
      <span className="headline-line headline-accent" aria-hidden="true"><HybridText text="MOTION." pixelIndices={[1]} /></span>
    </h1>
  )
}
