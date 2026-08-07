import { Check, ChevronDown, ChevronRight, Crown, Lock, Star, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AVAILABLE_MODELS } from "../config/api";
import { useAuth } from "../context/AuthContext";

const ADAPTIVE_THINKING_KEY = "runner-code:adaptive-thinking";

export function isAdaptiveThinkingEnabled(): boolean {
  try { return localStorage.getItem(ADAPTIVE_THINKING_KEY) === "1"; } catch { return false; }
}

type Tier = "premium" | "fast" | "free";

const TIER_BADGE: Record<Tier, { bg: string; text: string; border: string; label: string }> = {
  premium: { bg: "bg-amber-500/15",   text: "text-amber-500",   border: "border-amber-500/40",   label: "PRO"  },
  fast:    { bg: "bg-blue-500/15",    text: "text-blue-500",    border: "border-blue-500/40",    label: "FAST" },
  free:    { bg: "bg-emerald-500/15", text: "text-emerald-500", border: "border-emerald-500/40", label: "FREE" },
};

const TIER_DOT: Record<Tier, string> = {
  premium: "bg-amber-500",
  fast:    "bg-blue-500",
  free:    "bg-emerald-500",
};

const TIER_LABEL_TEXT: Record<Tier, string> = {
  premium: "text-amber-500",
  fast:    "text-blue-500",
  free:    "text-emerald-500",
};

const TIER_LABEL: Record<Tier, string> = {
  premium: "Premium",
  fast:    "Fast",
  free:    "Free",
};

const TIER_COLOR: Record<Tier, string> = {
  premium: "#f59e0b",
  fast:    "#3b82f6",
  free:    "#10b981",
};

const TIERS: Tier[] = ["premium", "fast", "free"];

function TierIcon({ tier, size = 14 }: { tier: Tier; size?: number }) {
  const c = TIER_COLOR[tier];
  const cls = `flex-shrink-0`;
  if (tier === "premium") return <Crown  width={size} height={size} className={cls} color={c} />;
  if (tier === "fast")    return <Zap    width={size} height={size} className={cls} color={c} />;
  return                         <Star   width={size} height={size} className={cls} color={c} />;
}

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Compact chip-style trigger (for use inside the chat input pill). */
  compact?: boolean;
}

export function ModelSelector({ value, onChange, disabled, fullWidth, compact }: ModelSelectorProps) {
  const { user, updatePreferences } = useAuth();
  const [open, setOpen]             = useState(false);
  const [moreOpen, setMoreOpen]     = useState(false);
  // Source of truth: user.preferences.adaptiveThinking (DB). Falls back to localStorage cache for anon users.
  const adaptive = user
    ? user.preferences?.adaptiveThinking === true
    : (() => { try { return localStorage.getItem(ADAPTIVE_THINKING_KEY) === "1"; } catch { return false; } })();
  const toggleAdaptive = () => {
    const next = !adaptive;
    if (user) {
      updatePreferences({ adaptiveThinking: next }).catch(() => { /* swallow — already optimistic */ });
    } else {
      try { localStorage.setItem(ADAPTIVE_THINKING_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      // Force re-render via dummy state
      setOpen((o) => o);
    }
  };
  const [maxDropdownH, setMaxDropdownH] = useState(400);
  const [dropdownW, setDropdownW]   = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const [isNarrow, setIsNarrow] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = AVAILABLE_MODELS.find((m) => m.id === value) ?? AVAILABLE_MODELS[0];
  const tier     = selected.tier as Tier;
  const badge    = TIER_BADGE[tier];

  // Featured: free models — the only currently-selectable tier. Paid tiers are
  // kept in the list (so existing conversations show their original model name)
  // but rendered locked.
  const featuredModels = AVAILABLE_MODELS.filter((m) => m.tier === "free");
  const featuredIds    = featuredModels.map((m) => m.id);
  const moreModels     = AVAILABLE_MODELS.filter((m) => !featuredIds.includes(m.id));

  const calcGeometry = () => {
    if (!triggerRef.current) return;
    const rect   = triggerRef.current.getBoundingClientRect();
    const GAP    = 6;
    const narrow = window.innerWidth < 640;
    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const cap = Math.floor(window.innerHeight * 0.75);
    // Compact width on both mobile and desktop (Claude-style)
    const w   = Math.min(
      Math.max(rect.width, 280),
      window.innerWidth - 24
    );
    // Anchor near the trigger but clamp so it never overflows either edge
    const margin = narrow ? 12 : 8;
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - w - margin));

    if (spaceBelow < 240 && spaceAbove > spaceBelow) {
      setMaxDropdownH(Math.min(spaceAbove, cap));
      setDropdownPos({ bottom: window.innerHeight - rect.top + GAP, left });
    } else {
      setMaxDropdownH(Math.min(spaceBelow, cap));
      setDropdownPos({ top: rect.bottom + GAP, left });
    }
    setDropdownW(w);
    setIsNarrow(window.innerWidth < 640);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!open) calcGeometry();
    setOpen((prev) => {
      if (prev) setMoreOpen(false);
      return !prev;
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setMoreOpen(false); } };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", calcGeometry);
    window.addEventListener("scroll", calcGeometry, true);
    return () => {
      window.removeEventListener("resize", calcGeometry);
      window.removeEventListener("scroll", calcGeometry, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className={`relative ${fullWidth ? "w-full" : "inline-flex"}`}>

      {/* ── Trigger ── */}
      {compact ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          title={`${selected.name} · ${TIER_LABEL[tier]}`}
          className={`inline-flex items-center gap-1.5 h-9 px-2.5 rounded-full text-[12.5px] font-medium transition-colors touch-manipulation select-none ${
            open
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TIER_DOT[tier]}`} />
          <span className="truncate max-w-[140px]">{selected.name}</span>
          <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`${fullWidth ? "w-full" : "min-w-[180px]"} flex items-center gap-2 px-3 py-1.5 rounded-xl border font-medium transition-all duration-200 touch-manipulation select-none ${
            open
              ? "bg-card border-primary/60 ring-2 ring-primary/15 shadow-md"
              : "bg-muted/60 border-border/70 hover:border-primary/50 hover:bg-card/80 hover:shadow-sm"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {/* Tier dot */}
          <span className={`w-2 h-2 rounded-full flex-shrink-0 shadow-sm ${TIER_DOT[tier]}`} />

          {/* Model name */}
          <span className={`text-[13px] font-semibold text-foreground text-left truncate ${fullWidth ? "flex-1" : "flex-1"}`}>
            {selected.name}
          </span>

          {/* Tier badge */}
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border flex-shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
            {badge.label}
          </span>

          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* ── Dropdown (portal → escapes overflow-hidden parents) ── */}
      {open && createPortal(
        <>
          {/* Backdrop — invisible, full-screen, closes dropdown on outside click */}
          <div className="fixed inset-0 z-[9998]" onClick={() => { setOpen(false); setMoreOpen(false); }} />

          {/* Main dropdown panel */}
          <div
            className="fixed z-[9999] bg-card border border-border/70 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col overflow-hidden"
            style={{
              top:       dropdownPos.top,
              bottom:    dropdownPos.bottom,
              left:      dropdownPos.left,
              maxHeight: maxDropdownH,
              minWidth:  dropdownW,
              width:     dropdownW,
            }}
          >
            <div
              className="overflow-y-auto overscroll-contain touch-pan-y py-1.5"
              style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}
            >
              {/* Featured models */}
              {featuredModels.map((model) => {
                const isSelected = model.id === value;
                const isLocked   = (model as { locked?: boolean }).locked === true;
                return (
                  <button
                    key={model.id}
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      if (isLocked) return;
                      onChange(model.id); setOpen(false); setMoreOpen(false);
                    }}
                    title={isLocked ? "Coming soon" : undefined}
                    className={`w-full flex items-start gap-3 px-3.5 py-2.5 text-left transition-colors touch-manipulation
                      ${isLocked
                        ? "opacity-50 cursor-not-allowed"
                        : isSelected
                          ? "bg-primary/8"
                          : "hover:bg-muted/60 active:bg-muted/80"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[13.5px] font-semibold leading-tight truncate ${isSelected ? "text-foreground" : "text-foreground"}`}>
                          {model.name}
                        </span>
                      </div>
                      <span className="text-[11.5px] text-muted-foreground/80 block leading-tight mt-0.5 truncate">
                        {model.desc}
                      </span>
                    </div>
                    {isLocked
                      ? <Lock className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0 mt-0.5" />
                      : isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
                  </button>
                );
              })}

              {/* Divider */}
              <div className="my-1 mx-3 border-t border-border/40" />

              {/* Adaptive thinking toggle */}
              <button
                type="button"
                onClick={toggleAdaptive}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-muted/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-foreground leading-tight">Adaptive thinking</div>
                  <div className="text-[11.5px] text-muted-foreground/80 leading-tight mt-0.5">Thinks for more complex tasks</div>
                </div>
                {/* Toggle switch */}
                <span
                  className={`relative inline-flex flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${
                    adaptive ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      adaptive ? "translate-x-[18px]" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>

              {/* Divider */}
              <div className="my-1 mx-3 border-t border-border/40" />

              {/* More models — opens side submenu on desktop, auto-expanded inline on mobile (Claude-style) */}
              {isNarrow ? (
                <>
                  {/* Plain gray subheader */}
                  <div className="px-3.5 pt-2.5 pb-1 text-[11.5px] font-medium text-muted-foreground/70 select-none">
                    More models
                  </div>
                  {/* Flat list — no tier dots, no tier labels (Claude-style) */}
                  {moreModels.map((model) => {
                    const isSelected = model.id === value;
                    const isLocked   = (model as { locked?: boolean }).locked === true;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          if (isLocked) return;
                          onChange(model.id); setOpen(false); setMoreOpen(false);
                        }}
                        title={isLocked ? "Coming soon" : undefined}
                        className={`w-full flex items-center gap-2 px-3.5 py-2 text-left transition-colors
                          ${isLocked
                            ? "opacity-50 cursor-not-allowed"
                            : isSelected
                              ? "bg-primary/8"
                              : "hover:bg-muted/60 active:bg-muted/80"}`}
                      >
                        <span className="flex-1 text-[13px] font-semibold leading-tight truncate text-foreground">
                          {model.name}
                        </span>
                        {isLocked
                          ? <Lock className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" />
                          : isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </>
              ) : (
                <button
                  type="button"
                  onMouseEnter={() => setMoreOpen(true)}
                  onClick={() => setMoreOpen((v) => !v)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${moreOpen ? "bg-muted/60" : "hover:bg-muted/60"}`}
                >
                  <span className="flex-1 text-[13.5px] font-semibold text-foreground">More models</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" />
                </button>
              )}

              {/* (mobile inline tier-grouped expansion removed — replaced by Claude-style flat list above) */}
            </div>
          </div>

          {/* Side submenu (desktop only) */}
          {moreOpen && !isNarrow && (() => {
            const SUBMENU_W = 240;
            const mainW = dropdownW;
            const rightEdge = dropdownPos.left + mainW + 6 + SUBMENU_W;
            const flipLeft = rightEdge > window.innerWidth - 8;
            const subLeft = flipLeft
              ? Math.max(8, dropdownPos.left - SUBMENU_W - 6)
              : dropdownPos.left + mainW + 6;
            return (
              <div
                className="fixed z-[9999] bg-card border border-border/70 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col overflow-hidden"
                style={{
                  top:       dropdownPos.top,
                  bottom:    dropdownPos.bottom,
                  left:      subLeft,
                  maxHeight: maxDropdownH,
                  minWidth:  SUBMENU_W,
                }}
                onMouseLeave={() => setMoreOpen(false)}
              >
                <div
                  className="overflow-y-auto overscroll-contain touch-pan-y py-1.5"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}
                >
                  {TIERS.map((t) => {
                    const models = moreModels.filter((m) => m.tier === t);
                    if (models.length === 0) return null;
                    return (
                      <div key={t}>
                        <div className="flex items-center gap-1.5 px-3.5 pt-2 pb-1">
                          <TierIcon tier={t} size={10} />
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${TIER_LABEL_TEXT[t]}`}>
                            {TIER_LABEL[t]}
                          </span>
                        </div>
                        {models.map((model) => {
                          const isSelected = model.id === value;
                          const isLocked   = (model as { locked?: boolean }).locked === true;
                          return (
                            <button
                              key={model.id}
                              type="button"
                              disabled={isLocked}
                              onClick={() => {
                                if (isLocked) return;
                                onChange(model.id); setOpen(false); setMoreOpen(false);
                              }}
                              title={isLocked ? "Coming soon" : undefined}
                              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors
                                ${isLocked
                                  ? "opacity-50 cursor-not-allowed"
                                  : isSelected
                                    ? "bg-primary/8"
                                    : "hover:bg-muted/60 active:bg-muted/80"}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TIER_DOT[t]}`} />
                              <span className="flex-1 text-[13px] font-semibold leading-tight truncate text-foreground">
                                {model.name}
                              </span>
                              {isLocked
                                ? <Lock className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" />
                                : isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </>
      , document.body)}
    </div>
  );
}
