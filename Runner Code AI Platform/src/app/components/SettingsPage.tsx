import { ArrowLeft, Check, Eye, EyeOff, Globe, Lock, Moon, Palette, Sun } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Bahrain","Bangladesh",
  "Belgium","Brazil","Bulgaria","Canada","Chile","China","Colombia","Croatia","Czech Republic",
  "Denmark","Egypt","Finland","France","Germany","Greece","Hong Kong","Hungary","India","Indonesia",
  "Iran","Iraq","Ireland","Italy","Japan","Jordan","Kenya","Kuwait","Lebanon","Malaysia","Mexico",
  "Morocco","Netherlands","New Zealand","Nigeria","Norway","Oman","Pakistan","Palestine","Philippines",
  "Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Singapore","South Africa",
  "South Korea","Spain","Sweden","Switzerland","Syria","Taiwan","Thailand","Tunisia","Turkey",
  "UAE","UK","Ukraine","USA","Yemen","Other",
].sort();

const INPUT_CLS =
  "w-full pl-3 pr-10 py-3.5 rounded-xl bg-background/60 border border-border/60 " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all " +
  "text-sm text-foreground placeholder:text-muted-foreground/60 disabled:opacity-50 backdrop-blur-sm";

interface SettingsPageProps {
  onBack: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function SettingsPage({ onBack, theme, onToggleTheme }: SettingsPageProps) {
  const { user, updateCountry } = useAuth();
  const [settingsCountry, setSettingsCountry] = useState(user?.country || "");
  const [settingsPassword, setSettingsPassword] = useState("");
  const [settingsConfirm, setSettingsConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsCountry)                          { setError("Please select a country"); return; }
    if (!settingsPassword)                         { setError("Please enter a new password"); return; }
    if (settingsPassword.length < 8)               { setError("Password must be at least 8 characters"); return; }
    if (settingsPassword !== settingsConfirm)       { setError("Passwords do not match"); return; }
    setLoading(true);
    setError("");
    try {
      await updateCountry(settingsCountry, settingsPassword);
      setSuccess(true);
      setSettingsPassword("");
      setSettingsConfirm("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
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
        <span className="font-bold text-base text-foreground">Settings</span>
      </div>

      {/* Content */}
      <div className="flex-1 w-full max-w-lg mx-auto px-4 pt-5 pb-10 space-y-4">

        {/* Appearance */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/20 flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Appearance</p>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {theme === "dark" ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Switch between themes</p>
                </div>
              </div>
              <button
                onClick={onToggleTheme}
                aria-label="Toggle theme"
                className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-300 touch-manipulation active:scale-95 ${
                  theme === "light" ? "bg-primary" : "bg-muted"
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                  theme === "light" ? "left-7" : "left-1"
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Account form */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/20 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Account</p>
          </div>
          <form onSubmit={handleSave} className="px-4 py-4 space-y-4" noValidate>

            {/* Country */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Globe className="w-3.5 h-3.5 text-primary" /> Country
              </label>
              <select
                value={settingsCountry}
                onChange={(e) => { setSettingsCountry(e.target.value); setError(""); }}
                disabled={loading}
                className={INPUT_CLS + " pr-3 appearance-none"}
              >
                <option value="">Select your country</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Lock className="w-3.5 h-3.5 text-primary" /> New Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={settingsPassword}
                  onChange={(e) => { setSettingsPassword(e.target.value); setError(""); }}
                  disabled={loading}
                  autoComplete="new-password"
                  enterKeyHint="next"
                  className={INPUT_CLS}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-all touch-manipulation"
                  tabIndex={-1}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Lock className="w-3.5 h-3.5 text-primary" /> Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={settingsConfirm}
                  onChange={(e) => { setSettingsConfirm(e.target.value); setError(""); }}
                  disabled={loading}
                  autoComplete="new-password"
                  enterKeyHint="done"
                  className={INPUT_CLS}
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-all touch-manipulation"
                  tabIndex={-1}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="mt-px flex-shrink-0">⚠</span>
                <span className="flex-1 leading-snug">{error}</span>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 text-sm animate-in fade-in duration-200">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Settings saved successfully!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !settingsCountry || !settingsPassword || !settingsConfirm}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-semibold py-3.5 rounded-xl text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none touch-manipulation mt-1"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Saving\u2026
                </>
              ) : "Save Changes"}
            </button>
          </form>
        </div>

        {/* About */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/20">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">About</p>
          </div>
          <div className="px-4 py-4 space-y-3">
            {[
              { label: "App",     value: "Runner Code AI Platform" },
              { label: "Version", value: "v1.2.2" },
              { label: "Year",    value: "2026" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
                <span className="text-xs font-semibold text-foreground">{value}</span>
              </div>
            ))}
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
 
