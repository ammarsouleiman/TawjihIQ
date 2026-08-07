import { Eye, EyeOff, Globe, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import logo from "../../assets/3546325734eebbae935ba64a28db9c350a382fdd.png";
import { useAuth } from "../context/AuthContext";
import { AIBackground } from "./AIBackground";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Bahrain", "Bangladesh", "Belgium", "Brazil", "Bulgaria", "Canada", "Chile",
  "China", "Colombia", "Croatia", "Czech Republic", "Denmark", "Egypt",
  "Finland", "France", "Germany", "Greece", "Hong Kong", "Hungary", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Italy", "Japan", "Jordan", "Kenya",
  "Kuwait", "Lebanon", "Malaysia", "Mexico", "Morocco", "Netherlands",
  "New Zealand", "Nigeria", "Norway", "Oman", "Pakistan", "Palestine",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
  "Saudi Arabia", "Singapore", "South Africa", "South Korea", "Spain",
  "Sweden", "Switzerland", "Syria", "Taiwan", "Thailand", "Tunisia", "Turkey",
  "UAE", "UK", "Ukraine", "USA", "Yemen", "Other",
].sort();

const INPUT_CLS =
  "w-full pl-11 pr-4 py-3.5 rounded-xl bg-background/60 border border-border/60 " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all " +
  "text-base text-foreground placeholder:text-muted-foreground/60 disabled:opacity-50";

export function CountryModal() {
  const { completeProfile } = useAuth();
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!country) { setError("Please select your country"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setIsSubmitting(true);
    try {
      await completeProfile(country, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col items-start sm:items-center justify-start sm:justify-center p-0 sm:p-4 sm:py-10 overflow-y-auto">
      <AIBackground />

      <div className="relative z-10 w-full sm:max-w-[400px] sm:animate-in sm:zoom-in-95 sm:slide-in-from-bottom-4 duration-300">
        <div className="bg-card/80 backdrop-blur-md border-0 sm:border border-primary/20 rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl overflow-hidden min-h-[100dvh] sm:min-h-0 flex flex-col">

          {/* Header */}
          <div className="px-6 pt-8 pb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/30 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative inline-block">
                <img src={logo} alt="Runner Code"
                  className="w-16 h-16 rounded-2xl ring-2 ring-primary/30 shadow-lg" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card shadow" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Complete your profile</h1>
            <p className="text-sm text-muted-foreground mt-1">Set your country and a password to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-4" noValidate>

            {/* Country */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-foreground">Country</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); setError(""); }}
                  disabled={isSubmitting}
                  className={INPUT_CLS + " appearance-none"}
                >
                  <option value="">Select your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-foreground">Create a Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  disabled={isSubmitting}
                  className={INPUT_CLS + " pr-12"}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground active:scale-90 transition-all touch-manipulation"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-foreground">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  disabled={isSubmitting}
                  className={INPUT_CLS + " pr-12"}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground active:scale-90 transition-all touch-manipulation"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
            <button
              type="submit"
              disabled={isSubmitting || !country || !password || !confirmPassword}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-semibold py-3.5 rounded-xl text-base shadow-lg hover:shadow-primary/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none touch-manipulation mt-1"
            >
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : "Continue to Runner Code"}
            </button>
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
