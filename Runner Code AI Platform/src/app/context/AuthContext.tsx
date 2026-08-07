import React, { createContext, useContext, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

// Global 401 handler — fires when server says account no longer exists
let _forceLogout: (() => void) | null = null;
let _isInitializing = true; // prevent force-logout during initial session check
export function apiFetch(input: RequestInfo, init?: RequestInit) {
  return fetch(input, { credentials: 'include', ...init }).then((r) => {
    if (r.status === 401 && _forceLogout && !_isInitializing) _forceLogout();
    return r;
  });
}

export interface UserPreferences {
  theme?: "dark" | "light";
  sidebarOpen?: boolean;
  adaptiveThinking?: boolean;
  pushPromptDone?: boolean;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  country: string | null;
  theme?: "dark" | "light";
  sidebar_open?: boolean;
  preferences?: UserPreferences;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  pendingSetup: { setupToken: string; name: string; email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, country: string) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  completeProfile: (country: string, password: string) => Promise<void>;
  updateCountry: (country: string, password: string) => Promise<void>;
  updatePreferences: (prefs: UserPreferences) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSetup, setPendingSetup] = useState<{ setupToken: string; name: string; email: string } | null>(null);

  // Sync server-stored prefs to localStorage cache so non-React consumers (e.g. openrouter.ts) can read instantly.
  useEffect(() => {
    if (!user) return;
    try {
      const adaptive = user.preferences?.adaptiveThinking === true;
      localStorage.setItem("runner-code:adaptive-thinking", adaptive ? "1" : "0");
    } catch { /* ignore */ }
  }, [user]);

  // On mount: verify session cookie — also handles mobile Google OAuth redirect
  useEffect(() => {
    const handleInit = async () => {
      // Mobile Google OAuth returns id_token in URL hash
      const hash = window.location.hash;
      if (hash.includes('id_token=')) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const idToken = params.get('id_token');
        if (idToken) {
          window.history.replaceState({}, '', window.location.pathname + window.location.search);
          try {
            const res = await fetch(`${API_URL}/api/auth/google`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: idToken }),
            });
            const data = await res.json();
            if (res.ok) {
              if (data.needsSetup) {
                setPendingSetup({ setupToken: data.setupToken, name: data.name ?? '', email: data.email ?? '' });
              } else {
                setUser(data.user);
              }
            }
          } catch {}
          setIsLoading(false);
          return;
        }
      }

      // Cookie is sent automatically — just validate session
      fetch(`${API_URL}/api/auth/me`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setUser(data.user))
        .catch(() => setUser(null))
        .finally(() => { _isInitializing = false; setIsLoading(false); });
    };
    handleInit();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setUser(data.user);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    country: string
  ) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, country }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setUser(data.user);
  };

  const logout = () => {
    fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    setUser(null);
    setPendingSetup(null);
  };

  // Register global logout so apiFetch can trigger it on 401
  useEffect(() => { _forceLogout = logout; return () => { _forceLogout = null; }; }, []);

  const deleteAccount = async () => {
    const res = await fetch(`${API_URL}/api/auth/account`, {
      method: "DELETE",
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete account");
    // Don't setUser(null) here — let the loader finish first, then logout() is called
  };

  const googleLogin = async (idToken: string) => {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: "POST",
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: idToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Google sign-in failed");
    if (data.needsSetup) {
      setPendingSetup({ setupToken: data.setupToken, name: data.name ?? '', email: data.email ?? '' });
    } else {
      setUser(data.user);
    }
  };

  const completeProfile = async (country: string, password: string) => {
    if (!pendingSetup) throw new Error("No pending setup");
    const res = await fetch(`${API_URL}/api/auth/complete-profile`, {
      method: "POST",
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupToken: pendingSetup.setupToken, country, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to complete profile");
    setPendingSetup(null);
    setUser(data.user);
  };

  const updateCountry = async (country: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/profile`, {
      method: "PATCH",
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update profile");
    setUser((prev) => prev ? { ...prev, country: data.country } : prev);
  };

  const updatePreferences = async (prefs: UserPreferences) => {
    // Optimistic local update + localStorage cache for instant reads (e.g. openrouter.ts)
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...(prev.preferences || {}), ...prefs };
      const next = { ...prev, preferences: merged };
      if (prefs.theme) next.theme = prefs.theme;
      if (prefs.sidebarOpen !== undefined) next.sidebar_open = prefs.sidebarOpen;
      return next;
    });
    if (prefs.adaptiveThinking !== undefined) {
      try { localStorage.setItem("runner-code:adaptive-thinking", prefs.adaptiveThinking ? "1" : "0"); } catch { /* ignore */ }
    }

    try {
      const res = await apiFetch(`${API_URL}/api/user/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        const data = await res.json();
        setUser((prev) => prev ? { ...prev, preferences: data.preferences } : prev);
      }
    } catch { /* offline — local update already applied */ }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, pendingSetup, login, register, logout, deleteAccount, googleLogin, completeProfile, updateCountry, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
