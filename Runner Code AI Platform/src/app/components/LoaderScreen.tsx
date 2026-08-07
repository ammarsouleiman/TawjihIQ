// Professional post-auth loader screen.
// Shows for ~2.5s after login/register with an animated branded sequence,
// then calls onDone() to reveal the main app.

import { useEffect, useState } from "react";

interface LoaderScreenProps {
  userName: string;
  onDone: () => void;
  theme?: "dark" | "light";
}

// The animated "words" that cycle during loading — meaningful AI phrases
const WORDS = [
  "Initializing your workspace",
  "Connecting AI models",
  "Loading conversation history",
  "Preparing your environment",
  "Almost ready",
];

export function LoaderScreen({ userName, onDone, theme = "dark" }: LoaderScreenProps) {
  const isDark       = theme === "dark";
  const bg           = isDark ? "#000000" : "#ffffff";
  const textPrimary  = isDark ? "#ffffff" : "#111111";
  const textMuted    = isDark ? "rgba(255,255,255,0.38)" : "rgba(17,17,17,0.45)";
  const textCycling  = isDark ? "rgba(255,255,255,0.45)" : "rgba(17,17,17,0.45)";
  const progressBg   = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const percentClr   = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)";
  const versionClr   = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const iconRingClr  = isDark ? "rgba(227,30,36,0.18)" : "rgba(227,30,36,0.25)";
  const iconRingOuter= isDark ? "rgba(227,30,36,0.10)" : "rgba(227,30,36,0.15)";
  const iconBgGrad   = isDark
    ? "radial-gradient(circle at 40% 35%, rgba(227,30,36,0.18) 0%, rgba(40,0,0,0.6) 60%, transparent 100%)"
    : "radial-gradient(circle at 40% 35%, rgba(227,30,36,0.12) 0%, rgba(255,220,220,0.35) 60%, transparent 100%)";
  const iconBorder   = isDark ? "rgba(227,30,36,0.25)" : "rgba(227,30,36,0.30)";
  const blobColor1   = isDark ? "rgba(227,30,36,0.10)" : "rgba(227,30,36,0.07)";
  const blobColor2   = isDark ? "rgba(227,30,36,0.07)" : "rgba(227,30,36,0.05)";
  const [wordIndex, setWordIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [dotsVisible, setDotsVisible] = useState(true);

  // Cycle through words
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => Math.min(i + 1, WORDS.length - 1));
    }, 480);
    return () => clearInterval(interval);
  }, []);

  // Animate progress bar — reaches 100 at ~2.3s
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const DURATION = 2300;

    function tick(now: number) {
      const elapsed = now - start;
      const raw = Math.min(elapsed / DURATION, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - raw, 3);
      setProgress(Math.round(eased * 100));

      if (raw < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // Start fade-out, then call onDone
        setFadeOut(true);
        setTimeout(onDone, 500);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  // Blinking dots animation
  useEffect(() => {
    const interval = setInterval(() => setDotsVisible((v) => !v), 600);
    return () => clearInterval(interval);
  }, []);

  const fullName = userName.trim();

  return (
    <>
      <style>{`
        @keyframes ls-fadein  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ls-pulse   { 0%,100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.15); } }
        @keyframes ls-rotate  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ls-orbit   { from { transform: rotate(0deg) translateX(38px) rotate(0deg); } to { transform: rotate(360deg) translateX(38px) rotate(-360deg); } }
        @keyframes ls-orbit2  { from { transform: rotate(180deg) translateX(52px) rotate(-180deg); } to { transform: rotate(540deg) translateX(52px) rotate(-540deg); } }
        @keyframes ls-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes ls-word    { 0% { opacity: 0; transform: translateY(6px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes ls-ring    { 0% { transform: scale(0.85); opacity: 0.4; } 50% { transform: scale(1.0); opacity: 0.15; } 100% { transform: scale(1.15); opacity: 0; } }
        @keyframes ls-bar-glow { 0%,100% { box-shadow: 0 0 8px rgba(227,30,36,0.5); } 50% { box-shadow: 0 0 20px rgba(227,30,36,0.9), 0 0 40px rgba(227,30,36,0.3); } }
      `}</style>

      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          width: "100%", height: "100%", minHeight: "100dvh",
          zIndex: 9999,
          background: bg,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          transition: "opacity 0.5s ease, transform 0.5s ease",
          opacity: fadeOut ? 0 : 1,
          transform: fadeOut ? "scale(1.04)" : "scale(1)",
          pointerEvents: "all",
        }}
      >
        {/* Subtle background gradient blobs */}
        <div style={{
          position: "absolute", top: "-20%", left: "-15%",
          width: "60vw", height: "60vw", borderRadius: "50%",
          background: `radial-gradient(circle, ${blobColor1} 0%, transparent 65%)`,
          filter: "blur(80px)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-20%", right: "-15%",
          width: "55vw", height: "55vw", borderRadius: "50%",
          background: `radial-gradient(circle, ${blobColor2} 0%, transparent 65%)`,
          filter: "blur(90px)", pointerEvents: "none",
        }} />

        {/* ── Main content ── */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 0, animation: "ls-fadein 0.6s ease both",
          width: "100%", maxWidth: 440,
          padding: "0 28px", boxSizing: "border-box",
        }}>

          {/* Icon cluster */}
          <div style={{ position: "relative", width: 120, height: 120, marginBottom: 32 }}>
            {/* Slow outer ring pulse */}
            <div style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              border: `1px solid ${iconRingClr}`,
              animation: "ls-ring 3s ease-in-out infinite",
            }} />
            <div style={{
              position: "absolute", inset: -20, borderRadius: "50%",
              border: `1px solid ${iconRingOuter}`,
              animation: "ls-ring 3s ease-in-out infinite 1s",
            }} />

            {/* Spinning dashed orbit track */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: `1px dashed ${iconRingClr}`,
              animation: "ls-rotate 10s linear infinite",
            }} />

            {/* Background circle */}
            <div style={{
              position: "absolute", inset: 8, borderRadius: "50%",
              background: iconBgGrad,
              border: `1px solid ${iconBorder}`,
              boxShadow: "inset 0 0 24px rgba(227,30,36,0.12)",
            }} />

            {/* Center — Runner Code logo */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <img
                src="/logo.png"
                alt="Runner Code"
                style={{
                  width: 62, height: 62, objectFit: "contain",
                  filter: "drop-shadow(0 0 10px rgba(227,30,36,0.55))",
                }}
              />
            </div>

            {/* Orbiting dot 1 — fast red */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              marginTop: -4, marginLeft: -4,
              animation: "ls-orbit 2.4s linear infinite",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#E31E24",
                boxShadow: "0 0 10px rgba(227,30,36,0.9), 0 0 20px rgba(227,30,36,0.4)",
              }} />
            </div>

            {/* Orbiting dot 2 — slow white */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              marginTop: -3, marginLeft: -3,
              animation: "ls-orbit2 4s linear infinite",
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)",
                boxShadow: isDark ? "0 0 8px rgba(255,255,255,0.5)" : "0 0 8px rgba(0,0,0,0.25)",
              }} />
            </div>
          </div>

          {/* Greeting */}
          <div style={{
            fontSize: "clamp(9px, 2.5vw, 11px)", fontWeight: 600,
            letterSpacing: "0.2em", textTransform: "uppercase",
            color: "rgba(227,30,36,0.65)", marginBottom: 10,
            animation: "ls-fadein 0.7s ease 0.15s both",
          }}>
            Runner Code AI Platform
          </div>
          <div style={{
            fontSize: "clamp(18px, 5.5vw, 26px)",
            fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em",
            marginBottom: 4, textAlign: "center",
            wordBreak: "break-word", overflowWrap: "break-word",
            width: "100%",
            animation: "ls-fadein 0.7s ease 0.25s both",
          }}>
            {fullName}
          </div>
          <div style={{
            fontSize: "clamp(11px, 3vw, 13px)",
            fontWeight: 400, color: textMuted,
            marginBottom: 32, textAlign: "center", letterSpacing: "0.01em",
            animation: "ls-fadein 0.7s ease 0.35s both",
          }}>
            Your session is being prepared
          </div>

          {/* Cycling status word */}
          <div style={{
            height: 22, marginBottom: 28, overflow: "hidden",
            textAlign: "center", width: "100%",
          }}>
            <div key={wordIndex} style={{
              fontSize: "clamp(11px, 3vw, 13px)",
              color: textCycling, fontWeight: 400,
              letterSpacing: "0.04em",
              animation: "ls-word 0.48s ease forwards",
            }}>
              {WORDS[wordIndex]}
              <span style={{ opacity: dotsVisible ? 1 : 0, transition: "opacity 0.15s" }}>...</span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            width: "100%", maxWidth: 320, height: 3, borderRadius: 99,
            background: progressBg,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 99,
              width: `${progress}%`,
              background: "linear-gradient(90deg, #E31E24 0%, #ff6060 50%, #E31E24 100%)",
              backgroundSize: "200% 100%",
              animation: "ls-bar-glow 1.2s ease-in-out infinite, ls-shimmer 2s linear infinite",
              transition: "width 60ms linear",
            }} />
          </div>

          {/* Percent */}
          <div style={{
            marginTop: 12, fontSize: 11, fontWeight: 600,
            color: percentClr, letterSpacing: "0.1em",
            fontVariantNumeric: "tabular-nums",
          }}>
            {progress}%
          </div>
        </div>

        {/* Bottom version tag */}
        <div style={{
          position: "absolute", bottom: 24, left: 0, right: 0,
          display: "flex", justifyContent: "center",
          fontSize: 10, color: versionClr, letterSpacing: "0.08em",
          animation: "ls-fadein 0.8s ease 0.5s both",
        }}>
          v1.2.2 &nbsp;·&nbsp; 2026
        </div>
      </div>
    </>
  );
}
