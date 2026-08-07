import { ArrowLeft, Check, Copy, Globe, Headphones, Inbox, LogOut, Mail, MessageSquare, Shield, Sparkles, Trash2, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Conversation } from "../types/chat";
import { Button } from "./ui/button";

const BACKEND_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

// Brand-only gradient palette — every shade is built from the app's primary red.
// Each user gets a deterministic gradient based on their name, but the look
// stays 100% on-brand (no off-palette colors like pink/orange/amber).
const AVATAR_GRADIENTS = [
  "from-primary to-primary/70",
  "from-primary to-primary/50",
  "from-primary/90 to-primary/60",
  "from-primary to-[#8a1216]",
  "from-[#ff4a4f] to-primary",
  "from-primary/80 to-[#7a0f13]",
] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface ProfilePageProps {
  onBack: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  conversations: Conversation[];
}

export function ProfilePage({ onBack, onSignOut, onDeleteAccount, conversations }: ProfilePageProps) {
  const { user, deleteAccount } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [emailCopied, setEmailCopied] = useState(false);
  const [reportsCount, setReportsCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/contact/my`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setReportsCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
    fetch(`${BACKEND_URL}/api/user/messages`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : {})
      .then((data: { messages?: unknown[] }) => setInboxCount(Array.isArray(data.messages) ? data.messages.length : 0))
      .catch(() => {});
  }, []);

  const handleCopyEmail = async () => {
    if (!user?.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  };

  if (!user) return null;

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (name.length === 1) return name.toUpperCase();
    return (name[0] + name[name.length - 1]).toUpperCase();
  };

  const memberSince = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Deterministic gradient per user (stable across renders).
  const avatarGradient = useMemo(
    () => AVATAR_GRADIENTS[hashString(user.name || user.email || "x") % AVATAR_GRADIENTS.length],
    [user.name, user.email]
  );

  // Profile strength — percentage of completed account fields.
  const completionItems = useMemo(() => [
    { label: "Full name",        done: !!user.name?.trim() },
    { label: "Email address",    done: !!user.email?.trim() },
    { label: "Country selected", done: !!user.country?.trim() },
  ], [user.name, user.email, user.country]);
  const completionDone = completionItems.filter(i => i.done).length;
  const completionPercent = Math.round((completionDone / completionItems.length) * 100);
  const missingCount = completionItems.length - completionDone;

  const infoRows = [
    { icon: User,   label: "Full Name",    value: user.name },
    { icon: Mail,   label: "Email",        value: user.email },
    { icon: Globe,  label: "Country",      value: user.country || "\u2014" },
    { icon: Shield, label: "Member Since", value: memberSince },
  ] as const;

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
        <span className="font-bold text-base text-foreground">My Profile</span>
      </div>

      {/* Content */}
      <div className="flex-1 w-full max-w-lg mx-auto px-4 pt-5 pb-10 space-y-4">

        {/* Hero */}
        <div className="rounded-2xl overflow-hidden border border-primary/20 bg-card shadow-xl">
          <div className="flex flex-col items-center py-8 px-5">
            <div className="relative mb-4">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center shadow-2xl ring-4 ring-primary/25`}>
                <span className="text-3xl font-black text-white drop-shadow">
                  {getInitials(user.name)}
                </span>
              </div>
              <div className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-green-500 rounded-full border-2 border-card shadow" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight text-center break-words w-full px-2">{user.name}</h1>
            <p className="text-xs text-muted-foreground mt-1 text-center break-all px-2">{user.email}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/25 text-xs font-semibold text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Active
            </span>
          </div>
        </div>

        {/* Profile strength */}
        <div className="bg-card border border-border/50 rounded-2xl px-4 py-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Profile Strength</span>
            <span className="text-xs font-black text-green-600 tabular-nums">{completionPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercent}%` }}
              role="progressbar"
              aria-valuenow={completionPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-2">
            {missingCount === 0
              ? "Your profile is complete."
              : `${missingCount} item${missingCount === 1 ? "" : "s"} left to complete your profile.`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Conversations", value: conversations.length, Icon: MessageSquare },
            { label: "Support Sent",  value: reportsCount,          Icon: Headphones },
            { label: "Inbox",         value: inboxCount,            Icon: Inbox },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="bg-card border border-border/50 rounded-2xl p-4 text-center transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <div className="w-8 h-8 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-primary tabular-nums">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Start-chatting CTA — only visible when the user hasn't started any conversation yet */}
        {conversations.length === 0 && (
          <button
            type="button"
            onClick={onBack}
            className="group w-full text-left bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/25 rounded-2xl p-4 flex items-center gap-3 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Start your first chat</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ask anything, build anything — Runner Code is ready.</p>
            </div>
            <ArrowLeft className="w-4 h-4 text-primary rotate-180 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Account info */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/20">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Account Information</p>
          </div>
          {infoRows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5 border-b border-border/20 last:border-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{value}</p>
              </div>
              {label === "Email" && (
                <button
                  onClick={handleCopyEmail}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-muted active:scale-90 transition-all touch-manipulation"
                  aria-label={emailCopied ? "Email copied" : "Copy email"}
                  title={emailCopied ? "Copied!" : "Copy email"}
                >
                  {emailCopied
                    ? <Check className="w-4 h-4 text-green-500" />
                    : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[0.97] transition-all touch-manipulation"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        {/* Danger zone */}
        <div className="bg-card border border-destructive/20 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-destructive/20 bg-destructive/5">
            <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">Danger Zone</p>
          </div>
          <div className="p-4">
            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Delete Account</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Permanently remove your account and all data</p>
                </div>
                <button
                  onClick={() => { setDeleteError(""); setShowDeleteConfirm(true); }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive text-xs font-semibold active:scale-95 transition-all touch-manipulation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-center">
                  <p className="text-sm font-bold text-destructive">Are you absolutely sure?</p>
                  <p className="text-xs text-muted-foreground mt-1">This action is permanent and cannot be undone.</p>
                </div>
                {deleteError && <p className="text-xs text-destructive text-center">{deleteError}</p>}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteError(""); }}
                    disabled={isDeletingAccount}
                    className="flex-1 rounded-xl h-11 touch-manipulation"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      setIsDeletingAccount(true);
                      setDeleteError("");
                      try {
                        await deleteAccount();
                        onDeleteAccount();
                      } catch (err) {
                        setDeleteError(err instanceof Error ? err.message : "Failed to delete account");
                        setIsDeletingAccount(false);
                      }
                    }}
                    disabled={isDeletingAccount}
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl h-11 touch-manipulation"
                  >
                    {isDeletingAccount ? "Deleting\u2026" : "Yes, Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>
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
  
