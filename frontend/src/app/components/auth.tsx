import { ArrowRight, GraduationCap, Route, Sparkles, Star, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Logo, LogoMark, StatusBar, useNav } from "./shell";

const GoogleBtn = () => {
  const { t } = useNav();
  return (
    <Button variant="outline" className="w-full bg-white">
      <svg width="17" height="17" viewBox="0 0 48 48" className="mr-1">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.3 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.2 5.6c4.2-3.9 6.6-9.6 6.6-16.9z" />
        <path fill="#FBBC05" d="M10.5 28.3c-.5-1.4-.8-2.9-.8-4.3s.3-3 .8-4.3l-7.9-6.1C1 16.8 0 20.3 0 24s1 7.2 2.6 10.4l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.2-5.6c-2 1.4-4.6 2.2-8.3 2.2-6.3 0-11.6-3.8-13.5-9.1l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
      </svg>
      {t("continue_google")}
    </Button>
  );
};
const AppleBtn = () => {
  const { t } = useNav();
  return (
    <Button variant="outline" className="w-full bg-black text-white hover:bg-black/90 hover:text-white border-black">
      <svg width="17" height="17" viewBox="0 0 384 512" fill="currentColor" className="mr-1">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM255.9 87c30.3-36 27.6-68.8 26.7-80.6-26.8 1.6-57.8 18.3-75.5 39-19.5 22.2-31 49.6-28.5 80.1 29 2.2 55.5-12.7 77.3-38.5z" />
      </svg>
      {t("continue_apple")}
    </Button>
  );
};

export function Splash() {
  const { go, t, user, token, profileComplete } = useNav();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user && token) {
        // Logged-in users must finish their personal info before entering.
        go(profileComplete ? "home" : "setup");
      } else {
        go("welcome");
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6"
      style={{ background: "linear-gradient(160deg, var(--brand-navy), #1a2c66 70%, var(--brand-purple))" }}
    >
      <div className="animate-pulse">
        <Logo light size={44} />
      </div>
      <p className="max-w-[240px] text-center text-[13px] text-blue-100/80">{t("tagline")}</p>
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-white/80"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function LangSwitch() {
  const { lang, setLang } = useNav();
  return (
    <div className="flex rounded-full bg-white p-0.5 text-[12px] shadow-sm">
      {(["EN", "AR"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-3 py-1 ${lang === l ? "bg-[var(--brand-blue)] text-white" : "text-slate-500"}`}
        >
          {l === "EN" ? "English" : "العربية"}
        </button>
      ))}
    </div>
  );
}

export function Welcome() {
  const { go, t } = useNav();
  const pills = [
    { icon: Target, key: "pill_match" },
    { icon: Route, key: "pill_roadmap" },
    { icon: Sparkles, key: "pill_ai" },
  ];
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* ambient background glows */}
      <div className="pointer-events-none absolute -left-16 -top-10 h-64 w-64 rounded-full bg-[var(--brand-blue)]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-40 h-72 w-72 rounded-full bg-[var(--brand-purple)]/15 blur-3xl" />

      <StatusBar />
      <div className="relative z-10 flex items-center justify-between px-7 pt-2">
        <Logo size={26} />
        <LangSwitch />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-7">
        {/* Hero brand emblem */}
        <div className="relative w-full">
          <div
            className="grid h-60 w-full place-items-center rounded-[2rem] px-10 shadow-[0_24px_60px_-24px_rgba(47,92,224,0.45)]"
            style={{ background: "linear-gradient(150deg, #4a6bf5, var(--brand-purple))" }}
          >
            {/* decorative ring */}
            <div className="absolute inset-4 rounded-[1.7rem] border border-white/15" />

            {/* floating chip — top right */}
            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-2xl bg-white/20 px-2.5 py-1.5 backdrop-blur-sm">
              <Sparkles size={13} className="text-amber-300" />
              <span className="text-[11px] font-semibold text-white">{t("chip_ai_powered")}</span>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-white/15 backdrop-blur">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-white shadow-lg">
                  <LogoMark size={40} />
                </div>
              </div>
              <span className="text-white" style={{ fontWeight: 700, fontSize: 26, letterSpacing: "-0.02em" }}>
                Tawjih<span className="text-blue-100">IQ</span>
              </span>
              <span className="max-w-[200px] text-center text-[12px] leading-relaxed text-blue-50/90">{t("tagline")}</span>
            </div>
          </div>

          {/* stats row — overlapping the card bottom edge */}
          <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-3">
            <div className="flex items-center gap-1.5 rounded-2xl bg-white px-3 py-1.5 shadow-md ring-1 ring-black/5">
              <GraduationCap size={13} className="text-[var(--brand-blue)]" />
              <span className="text-[11px] font-semibold text-[var(--brand-navy)]">{t("chip_majors")}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl bg-white px-3 py-1.5 shadow-md ring-1 ring-black/5">
              <TrendingUp size={13} className="text-emerald-500" />
              <span className="text-[11px] font-semibold text-[var(--brand-navy)]">{t("chip_match_rate")}</span>
            </div>
          </div>
        </div>

        {/* badge */}
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#eef2ff] px-3 py-1.5 text-[12px] text-[var(--brand-blue)]" style={{ fontWeight: 600 }}>
          <Sparkles size={13} /> {t("welcome_badge")}
        </div>

        <div className="text-center">
          <h1 style={{ fontSize: 27, lineHeight: 1.22 }}>{t("welcome_title")}</h1>
          <p className="mt-3 text-[14px] text-slate-500">{t("welcome_sub")}</p>
        </div>

        {/* feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {pills.map((p) => {
            const Icon = p.icon;
            return (
              <span key={p.key} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] text-slate-600 shadow-sm ring-1 ring-black/5">
                <Icon size={13} className="text-[var(--brand-blue)]" /> {t(p.key)}
              </span>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 space-y-3 px-7 pb-9">
        {/* trust row */}
        <div className="flex items-center justify-center gap-1.5 pb-1 text-[12px] text-slate-500">
          <span className="flex text-amber-400">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={13} fill="currentColor" strokeWidth={0} />
            ))}
          </span>
          {t("trusted_by")}
        </div>
        <Button className="w-full shadow-lg shadow-[var(--brand-blue)]/25" onClick={() => go("signup")}>
          {t("get_started")} <ArrowRight size={16} className="ml-1 rtl:rotate-180" />
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => go("login")}>
          {t("have_account")}
        </Button>
      </div>
    </div>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { back, rtl } = useNav();
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="flex items-center justify-between px-7 pt-2">
        <button onClick={back} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm">
          {rtl ? "›" : "‹"}
        </button>
        <LangSwitch />
      </div>
      <div className="flex-1 overflow-y-auto px-7 pb-8 pt-4">
        <Logo />
        <h1 className="mt-6" style={{ fontSize: 24 }}>{title}</h1>
        <p className="mt-1.5 text-[14px] text-slate-500">{subtitle}</p>
        <div className="mt-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function Login() {
  const { go, t, login } = useNav();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError(t("err_fill_all"));
      return;
    }
    setLoading(true);
    try {
      // login() routes to home or setup depending on profile completeness.
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("err_generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("welcome_back")} subtitle={t("login_sub")}>
      <div className="space-y-1.5">
        <Label>{t("email")}</Label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={(e) => e.key === "Enter" && submit()} />
      </div>
      <div className="space-y-1.5">
        <Label>{t("password")}</Label>
        <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && submit()} />
      </div>
      <button onClick={() => go("forgot")} className="text-[13px] text-[var(--brand-blue)]">
        {t("forgot_pw")}
      </button>
      {error && <p className="text-[13px] text-rose-500">{error}</p>}
      <Button className="w-full" onClick={submit} disabled={loading}>{loading ? t("please_wait") : t("login")}</Button>
      <div className="flex items-center gap-3 py-1 text-[12px] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />{t("or")}<span className="h-px flex-1 bg-slate-200" />
      </div>
      <GoogleBtn />
      <AppleBtn />
      <p className="text-center text-[13px] text-slate-500">
        {t("no_account")}{" "}
        <button onClick={() => go("signup")} className="text-[var(--brand-blue)]">{t("sign_up")}</button>
      </p>
    </AuthShell>
  );
}

export function SignUp() {
  const { t, signup } = useNav();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError(t("err_fill_all"));
      return;
    }
    if (password !== confirm) {
      setError(t("err_pw_match"));
      return;
    }
    if (!agree) {
      setError(t("err_agree_terms"));
      return;
    }
    setLoading(true);
    try {
      // signup() navigates to onboarding on success.
      await signup(name.trim(), email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("err_generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("create_account_title")} subtitle={t("signup_sub")}>
      <div className="space-y-1.5"><Label>{t("full_name")}</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("full_name")} /></div>
      <div className="space-y-1.5"><Label>{t("email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
      <div className="space-y-1.5"><Label>{t("password")}</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
      <div className="space-y-1.5"><Label>{t("confirm_pw")}</Label><Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && submit()} /></div>
      <label className="flex items-start gap-2.5 text-[13px] text-slate-500">
        <Checkbox className="mt-0.5" checked={agree} onCheckedChange={(v) => setAgree(Boolean(v))} />
        <span>{t("agree_terms")}</span>
      </label>
      {error && <p className="text-[13px] text-rose-500">{error}</p>}
      <Button className="w-full" onClick={submit} disabled={loading}>{loading ? t("please_wait") : t("create_account")}</Button>
      <div className="flex items-center gap-3 py-1 text-[12px] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />{t("or")}<span className="h-px flex-1 bg-slate-200" />
      </div>
      <GoogleBtn />
      <AppleBtn />
    </AuthShell>
  );
}

export function Forgot() {
  const { back, t } = useNav();
  return (
    <AuthShell title={t("reset_pw")} subtitle={t("reset_sub")}>
      <div className="space-y-1.5"><Label>{t("email")}</Label><Input type="email" placeholder="you@example.com" /></div>
      <Button className="w-full" onClick={back}>{t("send_reset")}</Button>
    </AuthShell>
  );
}
