// AI Background — "Aurora Intelligence"
// Elegant, fluid, meaningful — inspired by modern AI product aesthetics
// Elements: aurora orbs · radial pulses · data streams · constellation

// Constellation stars: [cx, cy, r, twinkle-delay] in SVG viewBox (0-100 units)
// Constellation stars: [cx, cy, r, twinkle-delay-sec]
// SVG viewBox 0 0 100 100 coordinates
const STARS: [number, number, number, number][] = [
  // Perimeter (indices 0–15)
  [8,  15, 0.9, 0.0], [22,  6, 0.65, 1.5], [40,  4, 1.1, 0.8],
  [58,  8, 0.7, 2.3], [74,  6, 1.0,  1.0], [88, 18, 0.8, 3.2],
  [94, 38, 1.2, 0.5], [91, 58, 0.7,  2.0], [85, 76, 1.0, 1.8],
  [72, 88, 0.8, 0.3], [55, 93, 1.1,  2.5], [38, 91, 0.65,1.1],
  [20, 84, 0.9, 3.7], [7,  70, 0.7,  0.9], [4,  50, 1.0, 2.2],
  [6,  30, 0.65,1.6],
  // Inner cluster (indices 16–23)
  [32, 28, 1.0, 0.4], [50, 32, 1.7, 1.9],  // index 17 = hub
  [66, 27, 1.0, 0.7], [74, 44, 0.8, 2.8],
  [62, 60, 1.1, 1.2], [45, 58, 0.8, 0.6],
  [28, 50, 1.0, 3.1], [18, 38, 0.7, 2.0],
  // Scattered accents (indices 24–29)
  [36, 18, 0.8, 1.4], [82, 34, 0.7, 0.2],
  [78, 65, 0.9, 2.6], [50, 75, 0.7, 1.7],
  [16, 62, 0.9, 0.8], [44, 16, 0.7, 3.4],
];

// Hub star index (rendered with special glow treatment)
const HUB = 17;

// Constellation edges [from, to]
const EDGES: [number, number][] = [
  // Outer ring arcs
  [0, 15], [1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14],
  // Outer → inner
  [0, 22], [2, 24], [4, 18], [6, 25], [8, 26], [10, 27], [12, 21], [14, 22],
  // Inner "nucleus" — hub connects outward
  [16, 17], [17, 18], [17, 21], [17, 22], [17, 24],
  // Inner mesh
  [16, 22], [18, 19], [19, 20], [20, 26], [21, 22], [22, 23],
  [25, 19], [27, 20], [28, 21], [29, 16],
];

// Data flow streams (bezier paths, slightly outside 0-100 bounds to reach edge-to-edge)
const STREAMS: { d: string; dur: number; begin: number }[] = [
  { d: "M-2,22 C18,18 32,40 52,35 S76,16 102,22",   dur: 9,    begin: 0   },
  { d: "M-2,68 C12,56 38,74 58,64 S84,76 102,70",   dur: 12,   begin: 2   },
  { d: "M-2,46 C22,36 44,62 64,52 S88,40 102,46",   dur: 10.5, begin: 1   },
  { d: "M18,-2 C22,22 40,18 50,32 S68,8 82,-2",     dur: 11,   begin: 3   },
  { d: "M20,102 C28,76 46,70 60,78 S80,94 100,102", dur: 13,   begin: 4.5 },
];

export function AIBackground() {
  return (
    <>
      {/* All keyframes prefixed "aibg-" to avoid global collisions */}
      <style>{`
        @keyframes aibg-blob1 {
          0%,100% { transform: translate(0px, 0px)   scale(1);    }
          25%     { transform: translate(30px,-20px)  scale(1.07); }
          50%     { transform: translate(-15px,18px)  scale(0.96); }
          75%     { transform: translate(12px, 24px)  scale(1.04); }
        }
        @keyframes aibg-blob2 {
          0%,100% { transform: translate(0px, 0px)   scale(1);    }
          30%     { transform: translate(-24px,18px)  scale(1.08); }
          65%     { transform: translate(18px,-16px)  scale(0.95); }
        }
        @keyframes aibg-blob3 {
          0%,100% { transform: translate(0px, 0px)   scale(1);    }
          40%     { transform: translate(20px, 22px)  scale(1.06); }
          75%     { transform: translate(-18px,-12px) scale(0.97); }
        }
        @keyframes aibg-blob4 {
          0%,100% { transform: translate(0px, 0px)   scale(1);    }
          45%     { transform: translate(-25px,14px)  scale(1.05); }
          80%     { transform: translate(14px,-20px)  scale(0.94); }
        }
      `}</style>

      <div
        className="fixed inset-0 pointer-events-none overflow-hidden select-none"
        aria-hidden="true"
        style={{ zIndex: 0 }}
      >
        {/* ── Aurora Orbs ─────────────────────────────────────────────── */}
        {/* These large blurry gradient blobs are the primary visual.      */}
        {/* They breathe and drift slowly like living aurora light.        */}

        {/* Orb 1 — top-left, deep red burst */}
        <div style={{
          position: "absolute", top: "-30%", left: "-20%",
          width: "70vw", height: "70vw", borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(227,30,36,0.14) 0%, rgba(200,15,15,0.06) 40%, transparent 70%)",
          filter: "blur(80px)",
          animation: "aibg-blob1 24s ease-in-out infinite",
          willChange: "transform",
        }} />

        {/* Orb 2 — bottom-right */}
        <div style={{
          position: "absolute", bottom: "-25%", right: "-18%",
          width: "60vw", height: "60vw", borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(227,30,36,0.11) 0%, rgba(150,10,10,0.04) 40%, transparent 70%)",
          filter: "blur(90px)",
          animation: "aibg-blob2 30s ease-in-out infinite 4s",
          willChange: "transform",
        }} />

        {/* Orb 3 — center, warm rose accent */}
        <div style={{
          position: "absolute", top: "25%", left: "28%",
          width: "48vw", height: "48vw", borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(255,60,60,0.05) 0%, transparent 65%)",
          filter: "blur(60px)",
          animation: "aibg-blob3 38s ease-in-out infinite 9s",
          willChange: "transform",
        }} />

        {/* Orb 4 — top-right, subtle depth */}
        <div style={{
          position: "absolute", top: "-15%", right: "-12%",
          width: "52vw", height: "46vw", borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(227,30,36,0.08) 0%, transparent 65%)",
          filter: "blur(100px)",
          animation: "aibg-blob4 34s ease-in-out infinite 15s",
          willChange: "transform",
        }} />

        {/* ── SVG layer: pulses + streams + constellation ──────────────── */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Soft glow for stream particles */}
            <filter id="aibg-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="0.7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Stronger glow for hub star */}
            <filter id="aibg-hubGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="1.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Radial pulse rings — emanate from the constellation's focal hub */}
          {([0, 5, 10, 15] as const).map((delay, i) => (
            <circle key={i} cx="50" cy="35" fill="none"
              stroke="rgba(227,30,36,0.28)" strokeWidth="0.14">
              <animate attributeName="r"
                values="1;52" dur="20s" repeatCount="indefinite" begin={`${delay}s`} />
              <animate attributeName="opacity"
                values="0.55;0" dur="20s" repeatCount="indefinite" begin={`${delay}s`} />
              <animate attributeName="stroke-width"
                values="0.18;0.04" dur="20s" repeatCount="indefinite" begin={`${delay}s`} />
            </circle>
          ))}

          {/* Data flow streams — smooth Bézier paths representing thought/data */}
          {STREAMS.map((s, i) => {
            const id = `aibg-st${i}`;
            return (
              <g key={i}>
                {/* Faint static stream path */}
                <path id={id} d={s.d} fill="none"
                  stroke="rgba(227,30,36,0.07)" strokeWidth="0.12" />
                {/* Glowing particle traveling along the stream */}
                <circle r="0.65" fill="#E31E24" filter="url(#aibg-glow)" fillOpacity="0">
                  <animateMotion dur={`${s.dur}s`} repeatCount="indefinite" begin={`${s.begin}s`}>
                    <mpath href={`#${id}`} />
                  </animateMotion>
                  <animate attributeName="fillOpacity"
                    values="0;0;0.95;0.95;0" keyTimes="0;0.05;0.14;0.86;1"
                    dur={`${s.dur}s`} repeatCount="indefinite" begin={`${s.begin}s`} />
                </circle>
              </g>
            );
          })}

          {/* Constellation edges — thin lines connecting the stars */}
          {EDGES.map(([a, b], i) => (
            <line key={i}
              x1={STARS[a][0]} y1={STARS[a][1]}
              x2={STARS[b][0]} y2={STARS[b][1]}
              stroke="rgba(227,30,36,0.16)" strokeWidth="0.09"
            />
          ))}

          {/* Constellation stars — gently twinkling */}
          {STARS.map(([cx, cy, r, delay], i) => {
            const isHub = i === HUB;
            return (
              <g key={i} filter={isHub ? "url(#aibg-hubGlow)" : undefined}>
                {/* Soft halo ring around larger/hub stars */}
                {(isHub || r >= 1.0) && (
                  <circle cx={cx} cy={cy} r={r * 3} fill="none"
                    stroke="rgba(227,30,36,0.10)" strokeWidth="0.08">
                    <animate attributeName="opacity"
                      values="0.25;0.65;0.25" dur={`${6 + (i % 4)}s`}
                      repeatCount="indefinite" begin={`${delay}s`} />
                  </circle>
                )}
                {/* Star body */}
                <circle cx={cx} cy={cy} r={r * 0.6} fill="rgba(255,255,255,0.82)">
                  <animate attributeName="opacity"
                    values="0.3;0.95;0.3" dur={`${4 + (i % 5)}s`}
                    repeatCount="indefinite" begin={`${delay}s`} />
                </circle>
                {/* Hub accent: red glowing center dot */}
                {isHub && (
                  <circle cx={cx} cy={cy} r={r * 0.9} fill="rgba(227,30,36,0.88)">
                    <animate attributeName="opacity"
                      values="0.65;1;0.65" dur="2.8s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}


