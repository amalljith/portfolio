import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const AuroraScene = lazy(() => import("./AuroraScene"));

class AuroraErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function useMediaPreference(query) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    media.addEventListener("change", onChange);
    onChange();
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export default function AuroraBackground({ accentColor }) {
  const rootRef = useRef(null);
  const pointer = useRef({ x: 0.75, y: 0.45, activeUntil: 0 });
  const reducedMotion = useMediaPreference("(prefers-reduced-motion: reduce)");
  const compact = useMediaPreference("(max-width: 700px), (pointer: coarse)");
  const [visible, setVisible] = useState(() => !document.hidden);
  const [inView, setInView] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      setVisible(!document.hidden);
      pointer.current.activeUntil = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            ([entry]) => setInView(entry.isIntersecting),
            { threshold: 0 },
          )
        : null;
    if (rootRef.current) observer?.observe(rootRef.current);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || !visible || !inView || failed) return;
    function onPointerMove(event) {
      if (event.pointerType !== "mouse") return;
      const bounds = rootRef.current?.getBoundingClientRect();
      if (!bounds?.width || !bounds.height) return;
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = 1 - (event.clientY - bounds.top) / bounds.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      pointer.current.x = x;
      pointer.current.y = y;
      pointer.current.activeUntil = performance.now() + 1200;
    }
    const onPointerLeave = (event) => {
      if (!event.relatedTarget) pointer.current.activeUntil = 0;
    };
    const onBlur = () => {
      pointer.current.activeUntil = 0;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerLeave, { passive: true });
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerLeave);
      window.removeEventListener("blur", onBlur);
    };
  }, [failed, inView, reducedMotion, visible]);

  return (
    <div
      className="aurora"
      ref={rootRef}
      aria-hidden="true"
      data-ready={ready && !failed}
      data-fallback={failed}
      data-reduced-motion={reducedMotion}
    >
      <div className="aurora-fallback">
        <div className="aurora__atmosphere" />
        <div className="aurora__ribbon aurora__ribbon--one" />
        <div className="aurora__ribbon aurora__ribbon--two" />
        <div className="aurora__ribbon aurora__ribbon--three" />
        <div className="aurora__haze" />
        <div className="aurora__stars" />
      </div>
      {!failed && (
        <AuroraErrorBoundary onFailure={onFailure}>
          <Suspense fallback={null}>
            <AuroraScene
              accentColor={accentColor}
              active={visible && inView}
              compact={compact}
              reducedMotion={reducedMotion}
              pointer={pointer}
              onReady={onReady}
              onFailure={onFailure}
            />
          </Suspense>
        </AuroraErrorBoundary>
      )}
    </div>
  );
}
