import { AlertCircle, ArrowLeft, Bell, CheckCircle2, ChevronDown, ChevronUp, Info, RotateCcw, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import logo from "../../assets/3546325734eebbae935ba64a28db9c350a382fdd.png";
import { useAuth } from "../context/AuthContext";

interface AdminMessage {
  id: number;
  subject: string;
  body: string;
  type: "info" | "warning" | "success" | "alert";
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  userReply: string | null;
  userRepliedAt: string | null;
}

interface AdminMessagesPanelProps {
  onBack: () => void;
  onMessagesRead?: () => void;
}

const typeConfig = {
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    accent: "bg-blue-500",
    icon: Info,
    text: "text-blue-400",
    label: "Info",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    accent: "bg-amber-500",
    icon: AlertCircle,
    text: "text-amber-400",
    label: "Warning",
  },
  success: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    accent: "bg-emerald-500",
    icon: CheckCircle2,
    text: "text-emerald-400",
    label: "Success",
  },
  alert: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    accent: "bg-red-500",
    icon: AlertCircle,
    text: "text-red-400",
    label: "Alert",
  },
};

function formatDate(str: string) {
  // SQLite stores UTC without 'Z' — append it so JS parses correctly as UTC
  const normalized = str.includes("T") || str.endsWith("Z") ? str : str.replace(" ", "T") + "Z";
  const d = new Date(normalized);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000)
    return d.toLocaleDateString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AdminMessagesPanel({ onBack, onMessagesRead }: AdminMessagesPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [sendingId, setSendingId] = useState<number | null>(null);
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

  useEffect(() => { loadMessages(); }, []);

  async function loadMessages() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/user/messages`, { credentials: "include" });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setMessages(data.messages || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function toggleExpand(msg: AdminMessage) {
    const newId = expandedId === msg.id ? null : msg.id;
    setExpandedId(newId);
    if (!msg.isRead && newId === msg.id) {
      try {
        await fetch(`${API_URL}/api/user/messages/${msg.id}/read`, { method: "POST", credentials: "include" });
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, isRead: true } : m));
        onMessagesRead?.();
      } catch { /* silent */ }
    }
    if (newId !== null) setTimeout(() => textareaRefs.current[msg.id]?.focus(), 160);
  }

  async function sendReply(msg: AdminMessage) {
    const text = (replyTexts[msg.id] ?? "").trim();
    if (!text) return;
    setSendingId(msg.id);
    try {
      const r = await fetch(`${API_URL}/api/user/messages/${msg.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reply: text }),
      });
      if (!r.ok) throw new Error();
      setMessages((prev) =>
        prev.map((m) => m.id === msg.id ? { ...m, userReply: text, userRepliedAt: new Date().toISOString() } : m)
      );
      setReplyTexts((prev) => ({ ...prev, [msg.id]: "" }));
    } catch { /* silent */ }
    finally { setSendingId(null); }
  }

  const unreadCount = messages.filter((m) => !m.isRead).length;
  const userInitials = user?.name ? getInitials(user.name) : "?";

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40 flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))` }}>
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl hover:bg-muted active:scale-90 transition-all touch-manipulation"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-bold text-base text-foreground truncate">Inbox</span>
          {unreadCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums flex-shrink-0">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={loadMessages}
          className="p-2.5 rounded-xl hover:bg-muted active:scale-90 transition-all touch-manipulation"
          aria-label="Refresh"
        >
          <RotateCcw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="w-full max-w-lg mx-auto px-4 pt-5 pb-12 space-y-4">

          {/* ── User identity card ──────────────────────────────── */}
          <div className="rounded-2xl bg-card border border-border/50 p-4 flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
              <span className="text-sm font-bold text-white">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{user?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email ?? "—"}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inbox</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{messages.length}</p>
            </div>
          </div>

          {/* ── Sender identity ─────────────────────────────────── */}
          <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/15 p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src={logo} alt="Runner Code" className="w-7 h-7 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">Runner Code News</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official announcements, updates &amp; notifications
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Verified sender" />
          </div>

          {/* ── How it works hint ───────────────────────────────── */}
          <div className="rounded-xl bg-muted/30 border border-border/30 px-4 py-3 flex gap-3 items-start">
            <span className="text-base leading-none mt-0.5">💬</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This is your personal inbox from the Runner Code team. You'll receive news, updates, and important announcements here.{" "}
              <span className="text-foreground/70 font-medium">You can reply to any message</span> and the team will see your response.
            </p>
          </div>

          {/* ── Messages list ────────────────────────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Bell className="w-10 h-10 text-muted-foreground/20 animate-pulse" />
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border/50 p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <Bell className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="font-bold text-sm text-foreground">All clear</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px] mx-auto">
                You have no messages from Runner Code News yet.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {messages.map((msg) => {
                const cfg = typeConfig[msg.type];
                const Icon = cfg.icon;
                const isExpanded = expandedId === msg.id;

                return (
                  <li
                    key={msg.id}
                    className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                      !msg.isRead ? "bg-card border-border shadow-sm" : "bg-card/40 border-border/30"
                    }`}
                  >
                    {/* Unread accent bar */}
                    {!msg.isRead && (
                      <div className={`h-0.5 w-full ${cfg.accent} opacity-60`} />
                    )}

                    {/* ── Header row ─────────────────────────────── */}
                    <button
                      className="w-full text-left px-4 py-3.5 flex gap-3 hover:bg-muted/20 active:bg-muted/40 transition-colors touch-manipulation"
                      onClick={() => toggleExpand(msg)}
                      aria-expanded={isExpanded}
                    >
                      {/* Sender avatar */}
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                        <img src={logo} alt="Runner Code" className="w-6 h-6 object-contain" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* From + type badge */}
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-bold text-foreground">Runner Code News</span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                          {!msg.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          )}
                          {msg.userReply && (
                            <span className="text-[10px] text-emerald-400 font-semibold ml-auto pr-1 flex-shrink-0">
                              ✓ Replied
                            </span>
                          )}
                        </div>
                        {/* Subject */}
                        <p className={`text-sm leading-snug ${!msg.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                          {msg.subject}
                        </p>
                        {/* Preview */}
                        {!isExpanded && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {msg.body}
                          </p>
                        )}
                      </div>

                      {/* Date + chevron */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-1.5 ml-2">
                        <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">
                          {formatDate(msg.createdAt)}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground/30" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground/30" />
                        }
                      </div>
                    </button>

                    {/* ── Expanded body ──────────────────────────── */}
                    {isExpanded && (
                      <div className="border-t border-border/20 px-4 pb-4 space-y-3 pt-3">
                        {/* Message bubble — from Runner Code */}
                        <div className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                            <img src={logo} alt="Runner Code" className="w-5 h-5 object-contain" />
                          </div>
                          <div className={`flex-1 rounded-2xl rounded-tl-sm p-3.5 border ${cfg.bg} ${cfg.border}`}>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                              {msg.body}
                            </p>
                            <p className="text-[10px] text-muted-foreground/50 mt-2.5 text-right">
                              {new Date(msg.createdAt.includes("T") || msg.createdAt.endsWith("Z") ? msg.createdAt : msg.createdAt.replace(" ", "T") + "Z").toLocaleString(undefined, {
                                month: "short", day: "numeric", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        {/* User reply bubble */}
                        {msg.userReply ? (
                          <div className="flex gap-2.5 flex-row-reverse">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-white">{userInitials}</span>
                            </div>
                            <div className="flex-1 rounded-2xl rounded-tr-sm bg-primary/10 border border-primary/15 p-3.5">
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                                {msg.userReply}
                              </p>
                              {msg.userRepliedAt && (
                                <p className="text-[10px] text-muted-foreground/50 mt-2.5">
                                  {formatDate(msg.userRepliedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Reply input */
                          <div className="flex gap-2.5 items-end pt-1">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 mb-0.5">
                              <span className="text-[10px] font-bold text-white">{userInitials}</span>
                            </div>
                            <div className="flex-1 space-y-2">
                              <textarea
                                ref={(el) => { textareaRefs.current[msg.id] = el; }}
                                value={replyTexts[msg.id] ?? ""}
                                onChange={(e) =>
                                  setReplyTexts((prev) => ({ ...prev, [msg.id]: e.target.value.slice(0, 500) }))
                                }
                                placeholder="Write a reply…"
                                rows={2}
                                className="w-full resize-none text-sm bg-muted/30 border border-border/50 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:bg-background transition-colors leading-relaxed"
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground/40">
                                  {(replyTexts[msg.id] ?? "").length}/500
                                </span>
                                <button
                                  onClick={() => sendReply(msg)}
                                  disabled={!(replyTexts[msg.id] ?? "").trim() || sendingId === msg.id}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                                >
                                  <Send className="w-3 h-3" />
                                  {sendingId === msg.id ? "Sending…" : "Reply"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

