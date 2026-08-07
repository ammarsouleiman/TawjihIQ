import {
  Award,
  Bell,
  Bookmark as BM,
  Bookmark,
  Briefcase,
  Check, ChevronRight,
  ClipboardList,
  CreditCard,
  Crown,
  FileText,
  Fingerprint,
  Globe,
  GraduationCap,
  HelpCircle,
  Languages,
  LogOut,
  Mic,
  Moon,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { Switch } from "../components/ui/switch";
import { ai, ChatTurn, useNotifications, useScholarships } from "../services/api";
import { Chip } from "./onboarding";
import { BackButton, BottomTabs, StatusBar, TopBar, useNav } from "./shell";

const Card = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div onClick={onClick} className={`rounded-2xl bg-white p-4 shadow-[0_2px_14px_rgba(11,21,51,0.05)] ${className}`}>{children}</div>
);

export function Explore() {
  const { go, t, td, recommendations } = useNav();
  const majors = recommendations?.majors ?? [];
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("Match");
  const cats = ["All", "Engineering", "Business", "Medicine", "IT", "Arts", "Education", "Law", "Science"];
  const catLabel = (c: string) => (c === "All" ? t("cat_all") : td(c));
  let list = majors.filter((m) => filter === "All" || m.category === filter);
  list = [...list].sort((a, b) =>
    sort === "Match" ? b.match - a.match : sort === "Demand" ? b.globalDemand - a.globalDemand : b.match - a.match
  );
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pt-1"><BackButton /><h2>{t("explore_majors")}</h2></div>
      <div className="px-5 pt-3">
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm">
          <Search size={16} className="text-slate-400" />
          <input placeholder={t("search_majors")} className="w-full bg-transparent text-[14px] outline-none" />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto px-5 py-3">
        {cats.map((c) => <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>{catLabel(c)}</Chip>)}
      </div>
      <div className="flex items-center gap-2 px-5 pb-1 text-[12px] text-slate-400">
        {t("sort_by")}
        {[["Match","sort_match"],["Demand","sort_demand"],["Salary","sort_salary"],["Difficulty","sort_difficulty"]].map(([v, k]) => (
          <button key={v} onClick={() => setSort(v)} className={sort === v ? "text-[var(--brand-blue)]" : ""}>{t(k)}</button>
        ))}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-28 pt-2">
        {majors.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <p className="text-[14px] text-slate-500">{t("no_majors_yet")}</p>
            <Button onClick={() => go("assessment")}>{t("start_assessment")}</Button>
          </div>
        )}
        {list.map((m) => (
          <Card key={m.id} onClick={() => go("major", m)} className="flex cursor-pointer items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#eef2ff] text-[var(--brand-blue)]" style={{ fontWeight: 700 }}>{m.match}%</div>
            <div className="flex-1">
              <div className="flex items-center gap-2"><span className="text-[15px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{td(m.name)}</span></div>
              <p className="text-[12px] text-slate-400">{td(m.category)} · {td(m.salary)} {t("salary")}</p>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </Card>
        ))}
      </div>
      <BottomTabs />
    </div>
  );
}

export function Market() {
  const { t, market, marketStatus, loadMarket } = useNav();
  useEffect(() => {
    if (marketStatus === "idle") loadMarket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketStatus]);
  const marketFields = market?.fields ?? [];
  const regional = market?.regional ?? [];
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar title={t("market_insights")} />
      <div className="flex-1 overflow-y-auto px-5 pb-10 pt-1">
        <Card className="bg-gradient-to-br from-[#eef2ff] to-[#f3edff]">
          <div className="flex items-center gap-2 text-[13px] text-[var(--brand-purple)]"><Sparkles size={15} /> {t("ai_explanation")}</div>
          <p className="mt-1.5 text-[13px] text-slate-700">
            {marketStatus === "loading"
              ? t("analyzing_sub")
              : market?.insight ?? t("market_ai_body")}
          </p>
        </Card>

        <h3 className="mb-2 mt-5 text-[15px]">{t("in_demand")}</h3>
        <div className="space-y-2.5">
          {marketFields.map((f) => (
            <Card key={f.name} className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-slate-700">{f.name}</span>
                <span className="flex items-center gap-1 text-[12px] text-emerald-600"><TrendingUp size={13} />{f.trend}</span>
              </div>
              <Progress value={f.demand} className="mt-2 h-1.5" />
            </Card>
          ))}
        </div>

        {regional.length > 0 && (
          <>
            <h3 className="mb-2 mt-5 text-[15px]">{t("regional")}</h3>
            <div className="grid grid-cols-2 gap-3">
              {regional.map((r) => (
                <Card key={r.region}>
                  <p className="text-[14px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{r.region}</p>
                  <p className="mt-1 text-[12px] text-slate-500">{r.fields}</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Scholarships() {
  const { t, td, toggleSaveScholarship, isScholarshipSaved } = useNav();
  const { data: scholarships } = useScholarships();
  const icons: Record<string, typeof Award> = { Scholarship: Award, Internship: Briefcase, Program: GraduationCap, "Open Day": GraduationCap };
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar title={t("scholarships_title")} />
      <div className="flex gap-2 overflow-x-auto px-5 py-3">
        {["All", "Scholarship", "Internship", "Program", "Lebanon", "Remote"].map((c, i) => <Chip key={c} active={i === 0}>{c === "All" ? t("cat_all") : td(c)}</Chip>)}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-10">
        {scholarships.map((s) => {
          const Icon = icons[s.type] ?? Award;
          return (
            <Card key={s.id}>
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eef2ff]"><Icon size={20} className="text-[var(--brand-blue)]" /></div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[15px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{td(s.title)}</span>
                    <Badge variant="secondary" className="shrink-0 bg-amber-50 text-amber-600">{td(s.type)}</Badge>
                  </div>
                  <p className="text-[12px] text-slate-400">{td(s.org)} · {td(s.country)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] text-rose-500">{t("deadline")} {s.deadline}</span>
                    <span className="text-[11px] text-emerald-600">{td(s.tag)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button className="flex-1" size="sm">{t("apply")}</Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleSaveScholarship(s)}
                  aria-label={t("save")}
                  className={isScholarshipSaved(s.id) ? "border-[var(--brand-blue)] text-[var(--brand-blue)]" : ""}
                >
                  <Bookmark size={15} fill={isScholarshipSaved(s.id) ? "currentColor" : "none"} />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

type Msg = { from: "ai" | "user"; text: string };
export function Chat() {
  const { t, profile, langCode, user } = useNav();
  const chatKey = `tjq.chat:${user?.id ?? "guest"}`;
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
  // Keep the conversation across navigation and reloads (scoped per user).
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      const raw = localStorage.getItem(chatKey);
      const parsed = raw ? (JSON.parse(raw) as Msg[]) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* ignore */
    }
    return [{ from: "ai", text: t("chat_greeting") }];
  });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Persist the conversation whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(chatKey, JSON.stringify(msgs));
    } catch {
      /* ignore */
    }
  }, [msgs, chatKey]);

  // Always keep the latest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, sending]);

  // Personalized starter questions generated from the student's profile.
  useEffect(() => {
    let active = true;
    ai
      .chatSuggestions(profile, langCode)
      .then((r) => {
        if (active && Array.isArray(r.suggestions) && r.suggestions.length) {
          setAiSuggestions(r.suggestions);
        }
      })
      .catch(() => {
        /* no suggestions if the request fails */
      });
    return () => {
      active = false;
    };
  }, [profile, langCode]);

  const suggestions = aiSuggestions ?? [];

  const send = async (msg: string) => {
    if (!msg.trim() || sending) return;
    const nextMsgs: Msg[] = [...msgs, { from: "user", text: msg }];
    setMsgs(nextMsgs);
    setText("");
    setSending(true);
    try {
      const history: ChatTurn[] = nextMsgs.map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.text,
      }));
      const { reply } = await ai.chat(history, profile, langCode);
      setMsgs((m) => [...m, { from: "ai", text: reply }]);
    } catch {
      setMsgs((m) => [...m, { from: "ai", text: t("chat_error") }]);
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="flex items-center gap-3 border-b border-black/5 px-5 pb-3 pt-1">
        <BackButton />
        <div className="grid h-10 w-10 place-items-center rounded-full" style={{ background: "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))" }}>
          <Sparkles size={18} className="text-white" />
        </div>
        <div><p className="text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{t("tab_advisor")}</p><p className="text-[12px] text-emerald-500">● {t("advisor_online")}</p></div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[14px] ${m.from === "user" ? "rounded-br-sm bg-[var(--brand-blue)] text-white" : "rounded-bl-sm bg-white text-slate-700 shadow-sm"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-slate-400 shadow-sm">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: "120ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: "240ms" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="px-5 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full bg-[#eef2ff] px-3 py-1.5 text-[12px] text-[var(--brand-blue)]">{s}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-black/5 bg-white px-4 py-3 pb-6">
        <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(text)} placeholder={t("ask_advisor")} className="flex-1" />
        <button className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500"><Mic size={17} /></button>
        <button onClick={() => send(text)} disabled={sending} className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand-blue)] text-white disabled:opacity-50"><Send size={16} /></button>
      </div>
    </div>
  );
}

export function Notifications() {
  const { t, td } = useNav();
  const { data: notifications } = useNotifications();
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar title={t("notifications_title")} />
      <div className="flex-1 space-y-2.5 overflow-y-auto px-5 pb-10 pt-1">
        {notifications.map((n) => (
          <Card key={n.id} className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef2ff]"><Bell size={16} className="text-[var(--brand-blue)]" /></div>
            <div className="flex-1">
              <p className="text-[14px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{td(n.title)}</p>
              <p className="text-[13px] text-slate-500">{td(n.body)}</p>
              <p className="mt-1 text-[11px] text-slate-400">{td(n.time)}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function Profile() {
  const { go, t, td, user, profile, profileCompletion } = useNav();
  const p = profile as Record<string, unknown>;
  const displayName =
    user?.name ||
    (typeof p.fullName === "string" ? (p.fullName as string) : "") ||
    t("guest");
  const email = user?.email ?? "";
  const metaParts = [p.educationLevel, p.country]
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");
  const meta = metaParts.length ? metaParts.map((v) => td(v)).join(" · ") : t("profile_meta");
  const rows: [typeof ClipboardList, string, () => void][] = [
    [Fingerprint, t("career_dna"), () => go("assessmentReport")],
    [ClipboardList, t("assessment_history"), () => go("results")],
    [BM, t("saved_majors"), () => go("shortlist")],
    [FileText, t("my_reports"), () => go("report")],
    [CreditCard, t("subscription"), () => go("premium")],
    [GraduationCap, t("edit_profile"), () => go("setup")],
  ];
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><BackButton /><h2>{t("profile_title")}</h2></div>
          <button onClick={() => go("settings")} className="text-[13px] text-[var(--brand-blue)]">{t("settings")}</button>
        </div>
        <Card className="mt-3 flex items-center gap-4">
          <Avatar className="h-16 w-16"><AvatarFallback className="bg-[var(--brand-blue)] text-white"><User size={26} /></AvatarFallback></Avatar>
          <div className="flex-1">
            <h3>{displayName}</h3>
            <p className="text-[13px] text-slate-400">{email || meta}</p>
            <Badge className="mt-1 bg-amber-100 text-amber-700">{t("free_plan")}</Badge>
          </div>
        </Card>
        <Card className="mt-3">
          <div className="flex items-center justify-between text-[13px]"><span className="text-slate-500">{t("profile_completion")}</span><span className="text-[var(--brand-blue)]" style={{ fontWeight: 600 }}>{profileCompletion}%</span></div>
          <Progress value={profileCompletion} className="mt-2 h-2" />
        </Card>
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
          {rows.map(([Icon, label, fn], i) => (
            <button key={label} onClick={fn} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${i > 0 ? "border-t border-slate-100" : ""}`}>
              <Icon size={18} className="text-[var(--brand-blue)]" />
              <span className="flex-1 text-[14px] text-slate-700">{label}</span>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          ))}
        </div>
      </div>
      <BottomTabs />
    </div>
  );
}

export function EditAccount() {
  const { t, user, profile, updateAccount, go } = useNav();
  const p = profile as Record<string, unknown>;
  const initialName =
    user?.name ||
    (typeof p.fullName === "string" ? (p.fullName as string) : "");
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Only allow saving when something actually changed.
  const dirty =
    name.trim() !== initialName.trim() ||
    email.trim() !== (user?.email ?? "").trim() ||
    newPassword.length > 0;

  const submit = async () => {
    setError(null);
    setSuccess(false);
    if (newPassword && !currentPassword) {
      setError(t("err_current_pw"));
      return;
    }
    setSaving(true);
    try {
      const patch: {
        name?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      } = { name: name.trim(), email: email.trim() };
      if (newPassword) {
        patch.currentPassword = currentPassword;
        patch.newPassword = newPassword;
      }
      await updateAccount(patch);
      setCurrentPassword("");
      setNewPassword("");
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("err_generic"));
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string) => (
    <p className="mb-1.5 text-[13px] text-slate-500">{label}</p>
  );

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar title={t("edit_account")} />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-28 pt-1">
        <p className="text-[13px] text-slate-500">{t("edit_account_sub")}</p>

        <div>
          {field(t("full_name"))}
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          {field(t("email"))}
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="pt-2">
          <p className="mb-2 text-[12px] uppercase tracking-wide text-slate-400">
            {t("change_password")}
          </p>
          <div className="space-y-3">
            <div>
              {field(t("current_password"))}
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              {field(t("new_password"))}
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <p className="text-[12px] text-slate-400">{t("password_hint")}</p>
          </div>
        </div>

        {error && <p className="text-[13px] text-rose-500">{error}</p>}
        {success && (
          <p className="text-[13px] text-emerald-600">{t("account_updated")}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={() => go("settings")}>
            {t("cancel")}
          </Button>
          <Button className="flex-1" onClick={submit} disabled={saving || !dirty}>
            {saving ? t("please_wait") : t("save_changes")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const { setLang, lang, t, dark, setDark, logout, go, deleteAccount } = useNav();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const doLogout = () => {
    logout();
    go("welcome");
  };
  const doDelete = async () => {
    setDelError(null);
    setDeleting(true);
    try {
      await deleteAccount();
      setConfirmOpen(false);
      go("welcome");
    } catch (e) {
      setDelError(e instanceof Error ? e.message : t("err_generic"));
    } finally {
      setDeleting(false);
    }
  };
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar title={t("settings")} />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-10 pt-1">
        <Group title={t("account")}>
          <Row icon={GraduationCap} label={t("edit_account")} onClick={() => go("editAccount")} />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Languages size={18} className="text-[var(--brand-blue)]" />
            <span className="flex-1 text-[14px] text-slate-700">{t("language")}</span>
            <div className="flex rounded-full bg-slate-100 p-0.5 text-[12px]">
              {(["EN", "AR"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`rounded-full px-3 py-1 ${lang === l ? "bg-[var(--brand-blue)] text-white" : "text-slate-500"}`}>{l === "EN" ? "English" : "العربية"}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-3.5">
            <Moon size={18} className="text-[var(--brand-blue)]" />
            <span className="flex-1 text-[14px] text-slate-700">{t("dark_mode")}</span>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
        </Group>
        <Group title={t("preferences")}>
          <Row icon={Bell} label={t("notif_settings")} />
          <Row icon={ShieldCheck} label={t("privacy")} />
        </Group>
        <Group title={t("support")}>
          <Row icon={HelpCircle} label={t("help_center")} />
          <Row icon={Globe} label={t("contact")} />
        </Group>
        <Group title={t("danger_zone")}>
          <Row icon={LogOut} label={t("logout")} danger onClick={doLogout} />
          <Row icon={Trash2} label={t("delete_account")} danger onClick={() => setConfirmOpen(true)} />
        </Group>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("delete_confirm_body")}</AlertDialogDescription>
          </AlertDialogHeader>
          {delError && <p className="text-[13px] text-rose-500">{delError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doDelete();
              }}
              disabled={deleting}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {deleting ? t("please_wait") : t("delete_account")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-1 text-[12px] uppercase tracking-wide text-slate-400">{title}</p>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">{children}</div>
    </div>
  );
}
function Row({ icon: Icon, label, danger, onClick }: { icon: typeof Bell; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-left first:border-t-0">
      <Icon size={18} className={danger ? "text-rose-500" : "text-[var(--brand-blue)]"} />
      <span className={`flex-1 text-[14px] ${danger ? "text-rose-500" : "text-slate-700"}`}>{label}</span>
      {!danger && <ChevronRight size={16} className="text-slate-300" />}
    </button>
  );
}

export function Shortlist() {
  const { t, td, go, savedMajors, toggleSaveMajor, savedScholarships, toggleSaveScholarship } = useNav();
  const empty = savedMajors.length === 0;
  const emptySch = savedScholarships.length === 0;
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar title={t("shortlist_title")} onBack={() => go("home")} />
      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-1">
        <h3 className="mb-2 text-[15px]">{t("saved_majors")}</h3>
        {empty ? (
          <Card className="flex flex-col items-center gap-2 py-8 text-center">
            <Bookmark size={28} className="text-slate-300" />
            <p className="text-[14px] text-slate-500">{t("shortlist_empty")}</p>
            <Button size="sm" onClick={() => go("results")}>{t("view_matches")}</Button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {savedMajors.map((m) => (
              <Card key={m.id} className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef2ff] text-[var(--brand-blue)]" style={{ fontWeight: 700 }}>{m.match}%</div>
                <button onClick={() => go("major", m)} className="flex-1 text-start text-[14px] text-slate-700">{td(m.name)}</button>
                <button onClick={() => toggleSaveMajor(m)} className="text-rose-400" aria-label={t("remove")}><Trash2 size={16} /></button>
              </Card>
            ))}
          </div>
        )}
        <h3 className="mb-2 mt-5 text-[15px]">{t("saved_scholarships")}</h3>
        {emptySch ? (
          <Card className="flex flex-col items-center gap-2 py-8 text-center">
            <Award size={26} className="text-slate-300" />
            <p className="text-[14px] text-slate-500">{t("shortlist_sch_empty")}</p>
            <Button size="sm" variant="outline" onClick={() => go("scholarships")}>{t("scholarships")}</Button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {savedScholarships.map((s) => (
              <Card key={s.id} className="flex items-center gap-3">
                <Award size={20} className="text-[var(--brand-blue)]" />
                <span className="flex-1 text-[14px] text-slate-700">{td(s.title)}</span>
                <button onClick={() => toggleSaveScholarship(s)} className="text-rose-400" aria-label={t("remove")}><Trash2 size={16} /></button>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-black/5 bg-white p-4">
        <Button className="w-full" disabled={savedMajors.length < 2} onClick={() => go("compare")}>{t("compare_selected")}</Button>
      </div>
    </div>
  );
}

export function Premium() {
  const { t } = useNav();
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const features = ["feat_report", "feat_unlimited", "feat_roadmap", "feat_compare", "feat_scholarship", "feat_chat", "feat_pdf"];
  return (
    <div className="flex h-full flex-col text-white" style={{ background: "linear-gradient(165deg, var(--brand-navy), #1a2c66)" }}>
      <StatusBar dark />
      <div className="px-6 pt-2">
        <BackButton />
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-1">
        <div className="mt-2 flex justify-center"><Crown size={40} className="text-amber-300" /></div>
        <h1 className="mt-3 text-center text-white" style={{ fontSize: 24 }}>{t("premium_title")}</h1>
        <p className="mt-1.5 text-center text-[13px] text-blue-100/80">{t("premium_sub")}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <PlanCard active={plan === "monthly"} onClick={() => setPlan("monthly")} title={t("monthly")} price="$6.99" sub={t("per_month")} />
          <PlanCard active={plan === "yearly"} onClick={() => setPlan("yearly")} title={t("yearly")} price="$49.99" sub={t("per_year")} badge={t("best_value")} />
        </div>

        <div className="mt-6 rounded-2xl bg-white/10 p-4 backdrop-blur">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2.5 py-1.5 text-[14px]">
              <Check size={16} className="text-emerald-300" /> {t(f)}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 p-3 text-[12px] text-blue-100/70">
          {t("free_includes")}
        </div>
      </div>
      <div className="px-6 pb-10">
        <Button className="w-full bg-amber-400 text-[var(--brand-navy)] hover:bg-amber-300">{t("upgrade_now")}</Button>
      </div>
    </div>
  );
}
function PlanCard({ active, onClick, title, price, sub, badge }: { active: boolean; onClick: () => void; title: string; price: string; sub: string; badge?: string }) {
  return (
    <button onClick={onClick} className={`relative rounded-2xl p-4 text-start transition ${active ? "bg-white text-[var(--brand-navy)]" : "bg-white/10 text-white"}`}>
      {badge && <span className="absolute -top-2 right-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] text-[var(--brand-navy)]" style={{ fontWeight: 700 }}>{badge}</span>}
      <p className="text-[13px] opacity-70">{title}</p>
      <p style={{ fontWeight: 700, fontSize: 22 }}>{price}</p>
      <p className="text-[12px] opacity-60">{sub}</p>
    </button>
  );
}
