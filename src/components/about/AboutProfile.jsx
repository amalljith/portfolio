import HybridText from '../HybridText'

export default function AboutProfile() {
  return (
    <aside className="developer-profile about__reveal" aria-label="Developer profile">
      <div className="developer-profile__top"><span>DEVELOPER PROFILE</span><span className="developer-profile__mark" aria-hidden="true" /></div>
      <div className="developer-profile__monogram" aria-hidden="true"><HybridText text="AJ." pixelIndices={[0, 1, 2]} /></div>
      <p className="developer-profile__signature">AMAL JITH <span>/</span> FULL STACK DEVELOPER</p>
      <dl className="developer-profile__details">
        <div><dt>FOCUS</dt><dd>Digital experiences</dd></div>
        <div><dt>DISCIPLINES</dt><dd>Design × development</dd></div>
        <div><dt>APPROACH</dt><dd>Logic meets intuition</dd></div>
      </dl>
      <span className="developer-profile__index" aria-hidden="true">AJ—001 / HUMAN BEHIND THE CODE</span>
    </aside>
  )
}
