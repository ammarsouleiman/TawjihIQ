// Delete-account loader screen — shows while account data is being erased
import { useEffect, useState } from "react";

interface DeleteAccountLoaderProps {
  onDone: () => void;
}

const STEPS = [
  "Deleting your conversations",
  "Removing messages and media",
  "Erasing your personal data",
  "Revoking access tokens",
  "Closing your account permanently",
];

export function DeleteAccountLoader({ onDone }: DeleteAccountLoaderProps) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((i) => Math.min(i + 1, STEPS.length - 1));
    }, 700);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const DURATION = 4000;
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
        @keyframes dal-fadein  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes dal-spin    { to { transform: rotate(360deg); } }
        @keyframes dal-shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
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
          gap: 0, animation: "dal-fadein 0.5s ease both",
          padding: "0 28px", maxWidth: 380, width: "100%", boxSizing: "border-box",
        }}>
          {/* Spinning ring */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            border: "2px solid rgba(227,30,36,0.15)",
            borderTop: "2px solid #E31E24",
            animation: "dal-spin 0.9s linear infinite",
            marginBottom: 32,
            boxShadow: "0 0 28px rgba(227,30,36,0.25)",
          }} />

          {/* Title */}
          <div style={{
            fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 700,
            color: "#fff", letterSpacing: "-0.01em",
            marginBottom: 8, textAlign: "center",
          }}>
            Deleting your account
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: "clamp(12px, 3.2vw, 14px)", color: "rgba(255,255,255,0.4)",
            marginBottom: 10, textAlign: "center", minHeight: 20,
          }}>
            {STEPS[step]}...
          </div>

          {/* Percentage */}
          <div style={{
            fontSize: "clamp(11px, 3vw, 13px)", color: "rgba(227,30,36,0.7)",
            marginBottom: 16, fontVariantNumeric: "tabular-nums",
          }}>
            {progress}%
          </div>

          {/* Progress bar */}
          <div style={{
            width: "100%", maxWidth: 300, height: 3, borderRadius: 99,
            background: "rgba(255,255,255,0.06)", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 99,
              width: `${progress}%`,
              background: "linear-gradient(90deg, #E31E24, #ff6060, #E31E24)",
              backgroundSize: "200% 100%",
              animation: "dal-shimmer 1.5s linear infinite",
              transition: "width 40ms linear",
            }} />
          </div>

          {/* Steps list */}
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                opacity: i <= step ? 1 : 0.2,
                transition: "opacity 0.4s ease",
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: i < step ? "#34A853" : i === step ? "#E31E24" : "rgba(255,255,255,0.2)",
                  boxShadow: i === step ? "0 0 8px rgba(227,30,36,0.6)" : "none",
                  transition: "background 0.4s ease",
                }} />
                <span style={{
                  fontSize: "clamp(10px, 2.8vw, 12px)",
                  color: i < step ? "rgba(52,168,83,0.8)" : i === step ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)",
                  transition: "color 0.4s ease",
                }}>{s}</span>
              </div>
            ))}
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
