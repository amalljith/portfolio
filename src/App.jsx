import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import AuroraBackground from "./components/aurora/AuroraBackground";
import { useAccentTheme } from "./hooks/useAccentTheme";
import HeroCaustics from "./components/caustics/HeroCaustics";
import CustomCursor from "./components/CustomCursor";
import CinematicPreloader from "./components/CinematicPreloader";

export default function App() {
  const { theme, setTheme } = useAccentTheme();
  const [notice, setNotice] = useState("");
  const heroRef = useRef(null);
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
        />
        <Hero onUpcoming={announceUpcoming} />
        <HeroCaustics enabled={intro !== "loading"} />
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
