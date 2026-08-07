// Sign-out loader screen — shows briefly while session is being cleared
import { useEffect, useState } from "react";

interface SignOutLoaderProps {
  onDone: () => void;
}

const STEPS = [
  "Saving your session",
  "Clearing local data",
  "Signing you out securely",
];

export function SignOutLoader({ onDone }: SignOutLoaderProps) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  // Cycle through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setStep((i) => Math.min(i + 1, STEPS.length - 1));
    }, 450);
    return () => clearInterval(interval);
  }, []);

  // Progress bar — reaches 100 in ~1.5s then fade out
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const DURATION = 1500;
    function tick(now: number) {
      const raw = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - raw, 2);
      setProgress(Math.round(eased * 100));
      if (raw < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setFadeOut(true);
        setTimeout(onDone, 400);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <>
      <style>{`
        @keyframes sol-fadein { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sol-spin   { to { transform: rotate(360deg); } }
        @keyframes sol-shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
      `}</style>

      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        width: "100%", height: "100%", minHeight: "100dvh",
        zIndex: 9999, background: "#000",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        transition: "opacity 0.4s ease",
        opacity: fadeOut ? 0 : 1,
        pointerEvents: "all",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "-20%", left: "20%",
          width: "60vw", height: "60vw", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(227,30,36,0.08) 0%, transparent 65%)",
          filter: "blur(80px)", pointerEvents: "none",
        }} />

        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 0, animation: "sol-fadein 0.5s ease both",
          padding: "0 28px", maxWidth: 380, width: "100%", boxSizing: "border-box",
        }}>
          {/* Spinning ring */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            border: "2px solid rgba(227,30,36,0.15)",
            borderTop: "2px solid #E31E24",
            animation: "sol-spin 0.9s linear infinite",
            marginBottom: 28,
            boxShadow: "0 0 20px rgba(227,30,36,0.2)",
          }} />

          {/* Title */}
          <div style={{
            fontSize: "clamp(16px, 4.5vw, 20px)", fontWeight: 700,
            color: "#fff", letterSpacing: "-0.01em",
            marginBottom: 6, textAlign: "center",
          }}>
            Signing out
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: "clamp(11px, 3vw, 13px)", color: "rgba(255,255,255,0.35)",
            marginBottom: 32, textAlign: "center",
          }}>
            {STEPS[step]}...
          </div>

          {/* Progress bar */}
          <div style={{
            width: "100%", maxWidth: 280, height: 2, borderRadius: 99,
            background: "rgba(255,255,255,0.06)", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 99,
              width: `${progress}%`,
              background: "linear-gradient(90deg, #E31E24, #ff6060, #E31E24)",
              backgroundSize: "200% 100%",
              animation: "sol-shimmer 1.5s linear infinite",
              transition: "width 40ms linear",
            }} />
          </div>
        </div>

        {/* Bottom */}
        <div style={{
          position: "absolute", bottom: 24, fontSize: 10,
          color: "rgba(255,255,255,0.12)", letterSpacing: "0.08em",
        }}>
          Runner Code AI Platform
        </div>
      </div>
    </>
  );
}
