import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import logo from "../../assets/3546325734eebbae935ba64a28db9c350a382fdd.png";
import { useAuth } from "../context/AuthContext";
import { AIBackground } from "./AIBackground";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, opts: object) => void;
        };
      };
    };
    __gsiCallback?: (r: { credential: string }) => void;
    __gsiInitialized?: boolean;
  }
}

const INPUT_CLS =
  "w-full pl-11 pr-4 py-3.5 rounded-xl bg-background/60 border border-border/60 " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all " +
  "text-base text-foreground placeholder:text-muted-foreground/60 disabled:opacity-50 backdrop-blur-sm";

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;
    const render = () => {
      if (!window.google || !googleBtnRef.current) return;
      // Store callback globally so re-renders reuse the same initialize call
      window.__gsiCallback = async ({ credential }) => {
        setIsGoogleLoading(true);
        setError("");
        try {
          await Promise.all([
            googleLogin(credential),
            new Promise(resolve => setTimeout(resolve, 5000)),
          ]);
          // success — keep loading screen until App.tsx navigates away
        }
        catch (err) {
          setError(err instanceof Error ? err.message : "Google sign-in failed");
          setIsGoogleLoading(false);
        }
      };
      if (!window.__gsiInitialized) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID!,
          callback: (r) => window.__gsiCallback?.(r),
        });
        window.__gsiInitialized = true;
      }
      window.google.accounts.id.renderButton(googleBtnRef.current!, {
        type: "standard", theme: "filled_black", size: "large",
        text: "signin_with", shape: "rectangular", width: 368,
      });
    };
    if (window.google) { render(); }
    else {
      const existing = document.getElementById("gsi-script");
      if (!existing) {
        const s = document.createElement("script");
        s.id = "gsi-script"; s.src = "https://accounts.google.com/gsi/client";
        s.async = true; s.defer = true; s.onload = render;
        document.head.appendChild(s);
      } else { existing.addEventListener("load", render, { once: true }); }
    }
  }, []);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleMobileGoogleSignIn = () => {
    setIsGoogleLoading(true);
    const nonce = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2));
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      redirect_uri: window.location.origin,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce,
      prompt: 'select_account',
    });
    setTimeout(() => {
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (!password.trim()) { setError("Password is required"); return; }
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isGoogleLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-background flex flex-col items-center justify-center">
        <div className="hidden sm:block"><AIBackground /></div>
        <div className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-card/80 backdrop-blur-md border border-primary/20 flex items-center justify-center shadow-2xl">
            <svg viewBox="0 0 24 24" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Signing you in with Google</h2>
            <p className="text-sm text-muted-foreground mt-1">Just a moment…</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4285F4] animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#EA4335] animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FBBC05] animate-bounce [animation-delay:0s]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#34A853] animate-bounce [animation-delay:0.15s]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col items-start sm:items-center justify-start sm:justify-center p-0 sm:p-4 sm:py-10 overflow-y-auto">
      <AIBackground />

      {/* Card — full-screen on mobile, centered card on desktop */}
      <div className="relative z-10 w-full sm:max-w-[400px] sm:animate-in sm:zoom-in-95 sm:slide-in-from-bottom-4 duration-300">
        <div className="bg-card/80 backdrop-blur-md border-0 sm:border border-primary/20 rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl overflow-hidden min-h-[100dvh] sm:min-h-0 flex flex-col">

          {/* Header */}
          <div className="px-5 sm:px-6 pt-10 sm:pt-8 pb-5 sm:pb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/30 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative inline-block">
                <img src={logo} alt="Runner Code"
                  className="w-16 h-16 rounded-2xl ring-2 ring-primary/30 shadow-lg" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card shadow" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Access your workspace</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to Runner Code AI</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-5 sm:px-6 py-5 sm:py-6 flex flex-col gap-4 flex-1" noValidate>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={INPUT_CLS}
                  disabled={isSubmitting}
                  autoComplete="email" autoFocus enterKeyHint="next"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={INPUT_CLS + " pr-12"}
                  disabled={isSubmitting}
                  autoComplete="current-password" enterKeyHint="done"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground active:scale-90 transition-all touch-manipulation"
                  tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="mt-px">⚠</span>
                <span className="flex-1 leading-snug">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={isSubmitting || isGoogleLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-semibold py-3.5 rounded-xl text-base shadow-lg hover:shadow-primary/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none touch-manipulation mt-1"
            >
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                : "Sign In"}
            </button>

            {/* Google Sign-In */}
            {GOOGLE_CLIENT_ID && (
              <>
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wide">or</span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
                {isMobile ? (
                  <button
                    type="button"
                    onClick={handleMobileGoogleSignIn}
                    className="w-full h-[50px] flex items-center justify-center gap-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm hover:bg-accent/40 hover:border-border hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer touch-manipulation"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="font-semibold text-sm text-foreground">Continue with Google</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleMobileGoogleSignIn}
                    className="w-full h-[50px] flex items-center justify-center gap-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm hover:bg-accent/40 hover:border-border hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="font-semibold text-sm text-foreground">Continue with Google</span>
                  </button>
                )}
              </>
            )}

            {/* Switch */}
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <button type="button" onClick={onSwitchToRegister}
                className="text-primary font-semibold hover:underline active:opacity-70 transition-all touch-manipulation">
                Create one
              </button>
            </p>
          </form>

          {/* Mobile footer */}
          <div className="sm:hidden mt-auto px-5 pb-7 pt-4 flex flex-col items-center gap-1.5">
            <div className="w-10 h-px bg-border/30 mb-1" />
            <p className="text-[11px] text-muted-foreground/50 tracking-wide">
              ✦ Powered by{" "}
              <span className="text-primary/70 font-bold">Runner Code AI</span>
            </p>
            <p className="text-[10px] text-muted-foreground/30">v1.2.2 · 2026</p>
          </div>

        </div>

        <p className="hidden sm:block text-center text-xs text-muted-foreground/40 mt-4">
          Powered by <span className="text-primary/60 font-semibold">Runner Code AI</span>
        </p>
      </div>
    </div>
  );
}
