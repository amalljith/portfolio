import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import AuroraBackground from "./components/aurora/AuroraBackground";
import { useAccentTheme } from "./hooks/useAccentTheme";
import HeroCaustics from "./components/caustics/HeroCaustics";
import CustomCursor from "./components/CustomCursor";
import CinematicPreloader from "./components/CinematicPreloader";
import AboutSection from "./components/about/AboutSection";

export default function App() {
  const { theme, setTheme } = useAccentTheme();
  const [notice, setNotice] = useState("");
  const heroRef = useRef(null);
  const heroStageRef = useRef(null);
  const focusHero = useRef(false);
  const [intro, setIntro] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "complete" : "loading"
  );
  const revealHero = useCallback(() => setIntro(current => current === "complete" ? current : "revealing"), []);
  const finishIntro = useCallback((restoreFocus) => {
    focusHero.current = restoreFocus;
    setIntro("complete");
  }, []);
  useLayoutEffect(() => {
    if (intro === "complete" && focusHero.current) {
      heroRef.current?.querySelector("#main")?.focus({ preventScroll: true });
      focusHero.current = false;
    }
  }, [intro]);

  function announceUpcoming(event, label) {
    event.preventDefault();
    setNotice(`${label} is not available yet.`);
  }

  function navigateToAbout(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const about = document.getElementById("about");
    if (!about) return;
    event.preventDefault();
    if (window.location.hash !== "#about") history.pushState(history.state, "", "#about");
    about.focus({ preventScroll: true });
    about.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  }

  return (
    <>
      <div
        ref={heroRef}
        className="portfolio-shell"
        inert={intro !== "complete"}
        aria-hidden={intro !== "complete" ? true : undefined}
        style={{
          "--accent": theme.color,
          "--energy-primary": theme.energyPrimary,
          "--energy-secondary": theme.energySecondary,
        }}
      >
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AuroraBackground
          entranceEnabled={intro !== "loading"}
          primaryColor={theme.energyPrimary}
          secondaryColor={theme.energySecondary}
        />
        <main id="main" className="portfolio-main" tabIndex={-1}>
          <div className="hero-stage" ref={heroStageRef} data-aurora-section="hero">
            <div className="frame-corners" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <Navbar
              theme={theme}
              onThemeChange={setTheme}
              onUpcoming={announceUpcoming}
              onAbout={navigateToAbout}
            />
            <Hero onUpcoming={announceUpcoming} onAbout={navigateToAbout} />
          </div>
          <AboutSection enabled={intro === "complete"} />
        </main>
        <HeroCaustics enabled={intro !== "loading"} scopeRef={heroStageRef} />
        {intro === "complete" && <CustomCursor accentColor={theme.color} />}
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {notice}
        </div>
      </div>
      {intro !== "complete" && (
        <CinematicPreloader
          accentColor={theme.color}
          heroRef={heroRef}
          onReveal={revealHero}
          onComplete={finishIntro}
        />
      )}
    </>
  );
}
