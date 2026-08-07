import { AlertTriangle, ArrowLeft, Check, Lightbulb, MessageCircle, MessageSquare, RefreshCw, Send, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

type ReportStatus = "pending" | "approved" | "rejected";
interface MyReport {
  id: number;
  type: string;
  subject: string;
  status: ReportStatus;
  admin_reply?: string;
  replied_at?: string;
  seen_at?: string | null;
  created_at: string;
}
const TYPE_LABEL: Record<string, string> = { bug: "Bug Report", suggestion: "Suggestion", request: "Feature Request", other: "Other" };
const TYPE_ICON: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  bug:        { icon: AlertTriangle,  color: "text-red-500",           bg: "bg-red-500/10" },
  suggestion: { icon: Lightbulb,      color: "text-yellow-500",        bg: "bg-yellow-500/10" },
  request:    { icon: Wrench,         color: "text-blue-500",          bg: "bg-blue-500/10" },
  other:      { icon: MessageSquare,  color: "text-muted-foreground",  bg: "bg-muted/40" },
};
const STATUS_CONFIG: Record<ReportStatus, { label: string; cls: string }> = {
  pending:  { label: "Under Review", cls: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600" },
  approved: { label: "Approved",     cls: "bg-green-500/10 border-green-500/30 text-green-600" },
  rejected: { label: "Rejected",     cls: "bg-red-500/10 border-red-500/30 text-red-500" },
};

const BACKEND_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const TYPES = [
  { value: "bug",        label: "Bug Report",    icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-500/10 border-red-500/30" },
  { value: "suggestion", label: "Suggestion",    icon: Lightbulb,     color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30" },
  { value: "request",   label: "Feature Request", icon: Wrench,       color: "text-blue-500",   bg: "bg-blue-500/10 border-blue-500/30" },
  { value: "other",     label: "Other",           icon: MessageSquare, color: "text-muted-foreground", bg: "bg-muted/30 border-border/50" },
] as const;

type ReportType = typeof TYPES[number]["value"];

const INPUT_CLS =
  "w-full px-3 py-3.5 rounded-xl bg-background/60 border border-border/60 " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all " +
  "text-sm text-foreground placeholder:text-muted-foreground/60 disabled:opacity-50";

interface ContactPageProps {
  onBack: () => void;
  onRepliesSeen?: () => void;
}

export function ContactPage({ onBack, onRepliesSeen }: ContactPageProps) {
  const { user } = useAuth();
  const [type, setType] = useState<ReportType>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [reports, setReports] = useState<MyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasInitedRef = useRef(false);

  const loadReports = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    fetch(`${BACKEND_URL}/api/contact/my`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setReports(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { setReportsLoading(false); setRefreshing(false); });
  };

  useEffect(() => {
    if (!hasInitedRef.current) {
      hasInitedRef.current = true;
      loadReports();
      // Clear the badge immediately, then mark replies as seen on the server
      onRepliesSeen?.();
      fetch(`${BACKEND_URL}/api/notifications/mark-seen`, { method: "POST", credentials: "include" }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = TYPES.find((t) => t.value === type)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) { setError("Please enter a subject"); return; }
    if (!message.trim()) { setError("Please enter your message"); return; }
    if (message.trim().length < 10) { setError("Message is too short"); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to send");
      setSuccess(true);
      setSubject("");
      setMessage("");
      loadReports(true);
    } catch {
      setError("Failed to send. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-y-auto">

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border/40 flex items-center gap-3 px-4 py-3" style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))` }}>
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl hover:bg-muted active:scale-90 transition-all touch-manipulation"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="font-bold text-base text-foreground">Support</span>
      </div>

      {/* Content */}
      <div className="flex-1 w-full max-w-lg mx-auto px-4 pt-5 pb-10 space-y-4">

        {/* Hero */}
        <div className="rounded-2xl bg-card border border-border/50 p-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-base font-bold text-foreground">We're listening</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Report a bug, share a suggestion, or request a feature.<br />We read every message.
          </p>
        </div>

        {/* Type selector */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/20">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type</p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {TYPES.map(({ value, label, icon: Icon, color, bg }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setType(value); setError(""); }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all active:scale-95 touch-manipulation ${
                  type === value
                    ? `${bg} ${color}`
                    : "bg-muted/20 border-border/40 text-muted-foreground hover:border-border"
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${type === value ? color : ""}`} />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/20 flex items-center gap-2">
            <selected.icon className={`w-3.5 h-3.5 ${selected.color}`} />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{selected.label}</p>
          </div>
          <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4" noValidate>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setError(""); }}
                placeholder="Brief title of your message"
                maxLength={100}
                disabled={loading || success}
                enterKeyHint="next"
                className={INPUT_CLS}
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Message</label>
              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value); setError(""); }}
                placeholder="Describe your issue, idea, or request in detail..."
                rows={5}
                maxLength={2000}
                disabled={loading || success}
                className={INPUT_CLS + " resize-none"}
              />
              <p className="text-right text-[10px] text-muted-foreground/50">{message.length}/2000</p>
            </div>

            {/* Sender info (read-only) */}
            {user && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/20 border border-border/40">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-black text-primary">
                    {user.name[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <span className="ml-auto text-[10px] text-muted-foreground/50 flex-shrink-0">Sender</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 text-sm animate-in fade-in duration-200">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Message sent successfully! We'll get back to you soon.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success || !subject.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-semibold py-3.5 rounded-xl text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none touch-manipulation"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Sending…
                </>
              ) : success ? (
                <>
                  <Check className="w-4 h-4" />
                  Sent!
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/20 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">My Reports</p>
            {!reportsLoading && (
              <span className="text-[10px] font-semibold text-muted-foreground/60">· {reports.length} total</span>
            )}
            <button
              onClick={() => loadReports(true)}
              disabled={refreshing || reportsLoading}
              className="ml-auto p-1.5 rounded-lg hover:bg-muted active:scale-90 transition-all disabled:opacity-50 disabled:pointer-events-none touch-manipulation"
              aria-label="Refresh reports"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${refreshing ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>

          {reportsLoading ? (
            <div className="divide-y divide-border/20">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-4 py-3.5 flex items-start gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-xl bg-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-2 w-16 rounded bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                    <div className="h-2 w-20 rounded bg-muted/60" />
                  </div>
                  <div className="h-5 w-16 rounded-full bg-muted" />
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="px-5 py-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-bold text-foreground">No reports yet</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px]">
                Your submitted reports will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {reports.map((r) => {
                const sc = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
                const ti = TYPE_ICON[r.type] ?? TYPE_ICON.other;
                const TIcon = ti.icon;
                return (
                  <div key={r.id} className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl ${ti.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <TIcon className={`w-4 h-4 ${ti.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wide">
                          {TYPE_LABEL[r.type] ?? r.type}
                        </span>
                        <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{r.subject}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1">
                          {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border mt-0.5 ${sc.cls}`}>
                        {sc.label}
                      </span>
                    </div>
                    {r.admin_reply && (
                      <div className="mt-2.5 ml-11 rounded-xl bg-violet-500/5 border border-violet-500/20 p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <MessageCircle className="w-3 h-3 text-violet-500" />
                          <span className="text-[9px] font-bold text-violet-500 uppercase tracking-widest">Admin reply</span>
                          {r.replied_at && (
                            <span className="text-[9px] text-muted-foreground/50 ml-auto">
                              {new Date(r.replied_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-violet-300/90 leading-relaxed whitespace-pre-wrap">{r.admin_reply}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground/50">
          <span>Powered by</span>
          <span className="font-bold text-primary/70">Runner Code AI</span>
          <span>· v1.2.2</span>
        </div>
      </div>
    </div>
  );
}
