import { ArrowDown, ArrowRight, Download, FolderOpen, FolderPlus, Headphones as HeadphonesIcon, Inbox as InboxIcon, Loader2, Menu, PanelLeft, Plus, RefreshCw, Search, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { AdminMessagesPanel } from "./components/AdminMessagesPanel";
import { Artifact, ArtifactsPanel } from "./components/ArtifactsPanel";
import { ChatInput } from "./components/ChatInput";
import { ChatMessage } from "./components/ChatMessage";
import { ContactPage } from "./components/ContactPage";
import { CountryModal } from "./components/CountryModal";
import { DeleteAccountLoader } from "./components/DeleteAccountLoader";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { LoaderScreen } from "./components/LoaderScreen";
import { LoginPage } from "./components/LoginPage";
import { ModelSelector } from "./components/ModelSelector";
import { NewProjectModal } from "./components/NewProjectModal";
import { ProfilePage } from "./components/ProfilePage";
import { ProjectView } from "./components/ProjectView";
import { RegisterPage } from "./components/RegisterPage";
import { SettingsPage } from "./components/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { SignOutLoader } from "./components/SignOutLoader";
import { Button } from "./components/ui/button";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { AVAILABLE_MODELS, DEFAULT_MODEL, SUGGESTIONS_MODEL } from "./config/api";
import { useAuth } from "./context/AuthContext";
import {
  deleteConversationFromServer,
  loadConversationsFromServer,
  loadMediaForConversation,
  loadReactions,
  removeReaction,
  saveConversationToServer,
  saveReaction,
} from "./services/conversations";
import { sendMessage } from "./services/openrouter";
import { searchPexelsImages } from "./services/pexels";
import {
  createProjectOnServer,
  deleteProjectOnServer,
  loadProjectsFromServer,
  updateProjectOnServer,
} from "./services/projects";
import { ChatMessage as ChatMessageType, Conversation, Project } from "./types/chat";
import { extractTextFromPDF, formatPDFTextForAI } from "./utils/pdfUtils";
import { listenForPushNavigate, registerPushNotifications } from "./utils/pushNotifications";
import { generateId } from "./utils/storage";

// Closes any unclosed ``` fences so ReactMarkdown always receives valid markdown
// during streaming — prevents raw-text → code-block "jump" mid-stream
function closeOpenCodeFences(text: string): string {
  const fenceCount = (text.match(/```/g) || []).length;
  return fenceCount % 2 !== 0 ? text + "\n```" : text;
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  // Projects (Claude-style folders). currentProjectId is set ONLY when the user
  // is on the project's landing page (no conversation selected); opening a chat
  // hides ProjectView automatically because the chat view takes precedence.
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const { user, logout, isLoading: authLoading, pendingSetup, updatePreferences } = useAuth();
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [showLoader, setShowLoader] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const prevUserRef = useRef<typeof user>(null);
  const [showSignOutLoader, setShowSignOutLoader] = useState(false);
  const [showDeleteAccountLoader, setShowDeleteAccountLoader] = useState(false);
  const [pendingModel, setPendingModel] = useState<string>(DEFAULT_MODEL);
  const [currentView, setCurrentView] = useState<"chat" | "profile" | "settings" | "contact" | "messages">("chat");
  const [unreadReplies, setUnreadReplies] = useState(0);
  const [unreadAdminMessages, setUnreadAdminMessages] = useState(0);
  const prevUnreadRef = useRef(0);
  const prevAdminMsgRef = useRef(0);
  const isFirstUnreadFetchRef = useRef(true);
  const currentViewRef = useRef(currentView);
  const showToastRef = useRef<(m: string, t?: "error" | "info") => void>(() => {});
  useEffect(() => { currentViewRef.current = currentView; }, [currentView]);

  // Poll backend for unread admin replies (every 15s + on focus + on tab visibility).
  useEffect(() => {
    if (!user) {
      setUnreadReplies(0);
      prevUnreadRef.current = 0;
      isFirstUnreadFetchRef.current = true;
      return;
    }
    const BACKEND_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/notifications/count`, { credentials: "include" });
        if (!r.ok || cancelled) return;
        const data = await r.json();
        if (cancelled) return;
        const newCount = Number(data?.count) || 0;
        const newAdminMsgs = Number(data?.adminMessages) || 0;
        // Fire a toast when the count INCREASES while the user is in the app
        // (skip the very first fetch, and skip when already on the profile view).
        if (
          !isFirstUnreadFetchRef.current &&
          newCount > prevUnreadRef.current &&
          currentViewRef.current !== "profile"
        ) {
          showToastRef.current("You have a new reply from Admin");
        }
        if (
          !isFirstUnreadFetchRef.current &&
          newAdminMsgs > prevAdminMsgRef.current
        ) {
          showToastRef.current("You have a new message");
        }
        prevUnreadRef.current = newCount;
        prevAdminMsgRef.current = newAdminMsgs;
        isFirstUnreadFetchRef.current = false;
        setUnreadReplies(newCount);
        setUnreadAdminMessages(newAdminMsgs);
      } catch {
        /* ignore network errors */
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 15_000);
    const onVisible = () => { if (document.visibilityState === "visible") fetchCount(); };
    const onFocus = () => fetchCount();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);

  const handleSignOut = () => {
    setCurrentView("chat");
    setShowSignOutLoader(true);
  };

  // Show loader only on fresh login/register — not on page refresh where user is already set
  useEffect(() => {
    if (!authLoading && user && prevUserRef.current === null) {
      // user just became authenticated → show the loader
      setShowLoader(true);
      setLoaderDone(false);
    }
    if (!authLoading) {
      prevUserRef.current = user;
    }
  }, [user, authLoading]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  // Which conversation owns the current streaming response. Lets us hide the
  // streaming bubble when the user switches away mid-stream (data is still
  // written to the original conversation on completion).
  const [streamingConversationId, setStreamingConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1024; // open by default on desktop, closed on mobile
  });

  // Toggle (in-memory state only; resets on refresh — matches Claude's session behavior).
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  // Re-apply the desktop/mobile default when the breakpoint actually crosses 1024px
  // (e.g. device rotation or window resize). Doesn't fight the user's explicit toggle
  // within the same breakpoint.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let wasDesktop = window.innerWidth >= 1024;
    const onResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      if (isDesktop !== wasDesktop) {
        wasDesktop = isDesktop;
        setIsSidebarOpen(isDesktop);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + B toggles the sidebar (Claude / VS Code parity).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Measure ChatInput height so the Sidebar footer can match it exactly
  // (keeps the two top borders on the same horizontal line).
  const chatInputWrapRef = useRef<HTMLDivElement>(null);
  const [chatInputHeight, setChatInputHeight] = useState<number>(0);
  useEffect(() => {
    const el = chatInputWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setChatInputHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRef = useRef<Map<string, number>>(new Map());
  const [reactions, setReactions] = useState<Map<string, "up" | "down">>(new Map());
  const [shownImageIds, setShownImageIds] = useState<Set<number>>(new Set());
  const [currentImagePage, setCurrentImagePage] = useState<Map<string, number>>(new Map());
  const [shouldForceScroll, setShouldForceScroll] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "error" | "info" }[]>([]);
  const toastIdRef = useRef(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);

  // Hydrate theme from authenticated user (persisted in DB under preferences.theme).
  useEffect(() => {
    const persisted = user?.preferences?.theme ?? user?.theme;
    if (persisted && persisted !== theme) {
      setTheme(persisted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.preferences?.theme, user?.theme]);

  // Apply theme class to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      // Fire-and-forget persist to backend; ignore failures (UI already updated).
      if (user) updatePreferences({ theme: next }).catch(() => {});
      return next;
    });
  };

  const showToast = (message: string, type: "error" | "info" = "info") => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Keep a ref to showToast so effects declared earlier can call it.
  useEffect(() => { showToastRef.current = showToast; });

  // Keyboard shortcuts: Ctrl+K → new chat, Ctrl+Shift+E → export
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        handleNewChat();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "E") {
        e.preventDefault();
        handleExportMarkdown();
      }
      // "?" — open keyboard shortcuts overlay, but never while typing.
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName;
        const editable = t?.isContentEditable;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && !editable) {
          e.preventDefault();
          setIsShortcutsOpen((v) => !v);
        }
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId, conversations]);

  // Load conversations from server on login
  useEffect(() => {
    if (!user) return;
    loadConversationsFromServer()
      .then(serverConvs => {
        if (serverConvs.length > 0) {
          setConversations(serverConvs);
          setCurrentConversationId(serverConvs[0].id);
          serverConvs.forEach(c => lastSyncedRef.current.set(c.id, c.updatedAt));
        }
      })
      .catch(() => {
        // Server unreachable — start with empty state
      });
    loadProjectsFromServer()
      .then(setProjects)
      .catch(() => { /* server unreachable — projects stay empty */ });
    // Register push notifications after login (best-effort).
    // If permission already granted → silently re-subscribe.
    // Native permission dialog (if needed) is triggered after loader via loaderDone effect.
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      registerPushNotifications();
    }
    // Navigate when user taps a push notification
    const cleanup = listenForPushNavigate((url) => {
      if (url === '/messages') setCurrentView('messages');
      else if (url === '/support') setCurrentView('contact');
    });
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Ask for push notification permission once per user account (tracked in DB).
  // Fires after the loader screen finishes — shows the native browser dialog once.
  useEffect(() => {
    if (!loaderDone || !user) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "denied") return;
    if (user.preferences?.pushPromptDone) return;
    // Mark done first (prevents re-asking on next login), then request native permission.
    updatePreferences({ pushPromptDone: true }).catch(() => {});
    registerPushNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaderDone, user?.id]);

  // Load reactions + media when switching conversations
  useEffect(() => {
    if (!currentConversationId || !user) return;
    setReactions(new Map());

    Promise.all([
      loadReactions(currentConversationId).catch(() => ({} as Record<string, "up" | "down">)),
      loadMediaForConversation(currentConversationId).catch(() => ({} as Record<string, { imageUrl?: string; imageUrls?: string[]; pdfUrl?: string }>)),
    ]).then(([reactionsData, mediaData]) => {
      setReactions(new Map(Object.entries(reactionsData)));

      if (Object.keys(mediaData).length > 0) {
        setConversations(prev => prev.map(c => {
          if (c.id !== currentConversationId) return c;
          return {
            ...c,
            messages: c.messages.map(m => {
              const media = mediaData[m.id];
              return media ? { ...m, ...media } : m;
            }),
          };
        }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId, user?.id]);

  // Sync changed conversations to server with 800ms debounce
  useEffect(() => {
    if (conversations.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      conversations.forEach(conv => {
        const lastSynced = lastSyncedRef.current.get(conv.id) ?? 0;
        if (conv.updatedAt > lastSynced) {
          lastSyncedRef.current.set(conv.id, conv.updatedAt);
          saveConversationToServer(conv).catch(() => {});
        }
      });
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [conversations]);

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  // Resolve a project's instructions for a given conversation (if it belongs to
  // a project). Returned string is appended to the AI system prompt at call time.
  const getProjectInstructions = (conv: Conversation | null | undefined): string | undefined => {
    if (!conv?.projectId) return undefined;
    const p = projects.find((pr) => pr.id === conv.projectId);
    return p?.instructions?.trim() ? p.instructions : undefined;
  };

  // The project the current conversation belongs to (if any). Drives the
  // "In project" pill shown in the chat header.
  const currentConversationProject = currentConversation?.projectId
    ? projects.find((p) => p.id === currentConversation.projectId) ?? null
    : null;

  // True only when an AI stream is in flight AND it belongs to the conversation
  // the user is currently viewing. Prevents the streaming bubble / loader / stop
  // button from leaking onto an unrelated conversation after the user navigates.
  const isStreamingHere =
    (isLoading || !!streamingMessage) &&
    streamingConversationId === currentConversationId;

  // Auto-scroll to bottom when sending message or when AI is streaming
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      
      // Force scroll if user just sent a message
      if (shouldForceScroll) {
        requestAnimationFrame(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        });
        setShouldForceScroll(false);
        return;
      }
      
      // Only auto-scroll while AI is streaming (writing) FOR THE CURRENT conversation.
      // If the stream belongs to a different conv (user switched away), don't yank scroll here.
      if (streamingMessage && streamingConversationId === currentConversationId) {
        requestAnimationFrame(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        });
      }
    }
  }, [currentConversation?.messages.length, streamingMessage, streamingConversationId, currentConversationId, shouldForceScroll]);

  // Force scroll to bottom when switching conversations, starting new chat, returning from Profile/Settings, or after initial load
  useEffect(() => {
    // Only scroll when in chat view
    if (currentView !== "chat") return;

    const scrollToEnd = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    // Multiple attempts to handle async DOM updates (loader → chat → markdown → images)
    const timeouts = [0, 50, 200, 500, 1000, 1500].map((d) => setTimeout(scrollToEnd, d));
    return () => { timeouts.forEach(clearTimeout); };
  }, [currentView, currentConversationId, currentConversation?.messages?.length, showLoader, loaderDone]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setIsScrolledUp(scrollHeight - scrollTop - clientHeight > 200);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const handleChangeModel = (model: string) => {
    if (!currentConversationId) {
      setPendingModel(model);
      return;
    }
    setConversations(prev => prev.map(c => c.id === currentConversationId ? { ...c, model } : c));
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c
    ));
  };

  const handleTogglePin = (id: string) => {
    const now = Date.now();
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, pinned: !c.pinned, updatedAt: now } : c
    ));
  };

  // Persist unsent draft text. Does NOT bump updatedAt (so sidebar order is preserved).
  // Fires a direct save bypassing the updatedAt-gated debounce.
  const handleDraftChange = (text: string) => {
    const id = currentConversationId;
    if (!id) return;
    setConversations(prev => {
      const next = prev.map(c => c.id === id ? { ...c, draft: text } : c);
      const updated = next.find(c => c.id === id);
      if (updated) saveConversationToServer(updated).catch(() => {});
      return next;
    });
  };

  const handleExportMarkdown = () => {
    if (!currentConversation || currentConversation.messages.length === 0) return;
    const lines: string[] = [
      `# ${currentConversation.title}`,
      '',
      `*Exported from Runner Code AI · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*`,
      '',
      '---',
      '',
    ];
    currentConversation.messages.forEach(msg => {
      const role = msg.role === 'user' ? '## You' : '## Runner Code AI';
      const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      lines.push(`${role} · ${time}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentConversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 50)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Shared streaming helper — avoids duplicate streaming boilerplate across handleSend/Edit/Regenerate
  const runStream = async (
    model: string,
    messages: Parameters<typeof sendMessage>[0]['messages'],
    targetConvId: string | null = currentConversationId,
    projectInstructions?: string,
  ): Promise<{ response: string; aborted: boolean }> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStreamingConversationId(targetConvId);
    let fullResponse = "";
    let hasStarted = false;

    try {
      const response = await sendMessage(
        { model, messages, stream: true, signal: controller.signal, projectInstructions },
        (chunk) => {
          if (!hasStarted) { hasStarted = true; setIsLoading(false); }
          fullResponse += chunk;
          if (rafRef.current === null) {
            rafRef.current = requestAnimationFrame(() => {
              setStreamingMessage(fullResponse);
              rafRef.current = null;
            });
          }
        }
      );
      abortControllerRef.current = null;
      return { response: response || fullResponse, aborted: false };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { response: fullResponse, aborted: true };
      }
      throw err;
    } finally {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setIsLoading(false);
      setStreamingConversationId(null);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!currentConversation || isLoading) return;
    const msgs = currentConversation.messages;
    const msgIndex = msgs.findIndex(m => m.id === messageId);
    if (msgIndex === -1 || msgs[msgIndex].role !== 'user') return;

    const editedMsg: ChatMessageType = {
      ...msgs[msgIndex],
      content: newContent,
      aiContent: undefined,
      timestamp: Date.now(),
    };
    const updatedMessages = [...msgs.slice(0, msgIndex), editedMsg];

    setConversations(prev => prev.map(c =>
      c.id === currentConversationId ? { ...c, messages: updatedMessages, updatedAt: Date.now() } : c
    ));
    setIsLoading(true);
    setStreamingMessage("");
    setShouldForceScroll(true);

    const CONTEXT_WINDOW = 20;
    const windowed = updatedMessages.length > CONTEXT_WINDOW
      ? updatedMessages.slice(-CONTEXT_WINDOW)
      : updatedMessages;
    const apiMessages = windowed.map(m => ({ role: m.role, content: m.aiContent || m.content }));

  try {
    const { response, aborted } = await runStream(
      currentConversation.model,
      apiMessages,
      currentConversationId,
      getProjectInstructions(currentConversation),
    );
    setStreamingMessage("");
    if (response.trim()) {
      const newMsg: ChatMessageType = { id: generateId(), role: "assistant", content: response, timestamp: Date.now() };
      setConversations(prev => prev.map(c =>
        c.id === currentConversationId
          ? { ...c, messages: [...updatedMessages, newMsg], updatedAt: Date.now() }
          : c
      ));
    }
    if (aborted) return;
  } catch {
    setStreamingMessage("");
  }
};

  const handleNewChat = (projectId?: string | null) => {
    const newConv: Conversation = {
      id: generateId(),
      title: "New Chat",
      messages: [],
      model: DEFAULT_MODEL,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      projectId: projectId ?? null,
    };
    setConversations([newConv, ...conversations]);
    setCurrentConversationId(newConv.id);
    setCurrentProjectId(null); // leave project view (chat takes precedence)

    // Reset image memory for new conversation
    setShownImageIds(new Set());
    setCurrentImagePage(new Map());
  };

  // ─── Project handlers ──────────────────────────────────────────────────────
  const handleOpenProject = (id: string) => {
    setCurrentProjectId(id);
    setCurrentConversationId(null);
    setCurrentView("chat");
    setIsSidebarOpen(window.innerWidth >= 1024);
  };

  const handleCreateProject = async (name: string = "New Project", color: string = "#e31e24") => {
    const id = generateId();
    // Optimistic: insert locally first so the UI feels instant.
    const optimistic: Project = {
      id, name, color, instructions: "",
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    setProjects((prev) => [optimistic, ...prev]);
    try {
      const saved = await createProjectOnServer({ id, name, color });
      setProjects((prev) => prev.map((p) => (p.id === id ? saved : p)));
      handleOpenProject(id);
    } catch {
      // Roll back on failure
      setProjects((prev) => prev.filter((p) => p.id !== id));
      showToast("Failed to create project", "error");
    }
  };

  const handleUpdateProject = async (
    id: string,
    patch: { name?: string; color?: string; instructions?: string },
  ) => {
    // Optimistic local update so the UI reflects edits immediately.
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
    );
    try {
      await updateProjectOnServer(id, patch);
    } catch {
      showToast("Failed to save project changes", "error");
    }
  };

  const handleDeleteProject = async (id: string) => {
    const projectsSnapshot = projects;
    const conversationsSnapshot = conversations;
    const wasViewingConvInProject = currentConversation?.projectId === id;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    // Cascade locally: drop every conversation that belonged to this project.
    setConversations((prev) => prev.filter((c) => c.projectId !== id));
    if (currentProjectId === id) setCurrentProjectId(null);
    if (wasViewingConvInProject) setCurrentConversationId(null);
    try {
      await deleteProjectOnServer(id);
    } catch {
      // Restore on failure
      setProjects(projectsSnapshot);
      setConversations(conversationsSnapshot);
      showToast("Failed to delete project", "error");
    }
  };

  const handleMoveConversationToProject = (convId: string, projectId: string | null) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, projectId, updatedAt: Date.now() } : c)),
    );
  };

  // Clear all messages in the current conversation (slash command /clear).
  const handleClearChat = () => {
    if (!currentConversation) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversationId ? { ...c, messages: [], updatedAt: Date.now() } : c
      )
    );
    setStreamingMessage("");
    setShownImageIds(new Set());
    setCurrentImagePage(new Map());
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setCurrentProjectId(null);
  };

  const handleReaction = (messageId: string, reaction: "up" | "down" | null) => {
    if (!currentConversationId) return;
    if (reaction === null) {
      setReactions(prev => { const m = new Map(prev); m.delete(messageId); return m; });
      removeReaction(messageId).catch(() => {});
    } else {
      setReactions(prev => new Map(prev).set(messageId, reaction));
      saveReaction(messageId, currentConversationId, reaction).catch(() => {});
    }
  };

  const handleDeleteConversation = (id: string) => {
    try {
      // If the conversation being deleted is currently streaming, abort the stream
      // so we don't keep a dangling network request writing to nothing.
      if (streamingConversationId === id && abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Sync deletion to server
      deleteConversationFromServer(id).catch(() => {});

      const filtered = conversations.filter((c) => c.id !== id);
      setConversations(filtered);

      if (currentConversationId === id) {
        const newCurrentId = filtered.length > 0 ? filtered[0].id : null;
        setCurrentConversationId(newCurrentId);
      }
    } catch {
      // Error deleting conversation
    }
  };

  // Stop the current AI generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Combined: generates title (first message only) + suggestions in ONE AI call
  const generateTitleAndSuggestions = async (
    userMsg: string,
    aiResponse: string,
    convId: string,
    msgId: string,
    isFirstMessage: boolean,
  ) => {
    if (aiResponse.includes("![") && aiResponse.includes("](http")) return;
    try {
      const titleInstruction = isFirstMessage
        ? `1. "title": A short conversation title, max 6 words, no punctuation, no quotes.`
        : `1. "title": null`;
      const prompt = `${titleInstruction}
2. "suggestions": Exactly 3 natural follow-up questions the user might ask next. Max 8 words each.
User: ${userMsg.slice(0, 300)}
AI: ${aiResponse.slice(0, 300)}
Return ONLY valid JSON — no other text:
{"title":"...or null","suggestions":["q1","q2","q3"]}`;

      const result = await sendMessage({
        model: SUGGESTIONS_MODEL,
        messages: [
          { role: "system", content: "You are a JSON generator. Output only valid JSON, no explanations, no other text." },
          { role: "user", content: prompt },
        ],
        stream: false,
        temperature: 0.4,
        max_tokens: 150,
      });

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      const parsed = JSON.parse(jsonMatch[0]);

      setConversations(prev => prev.map(c => {
        if (c.id !== convId) return c;
        let updated = { ...c };
        if (isFirstMessage && parsed.title && typeof parsed.title === 'string' && parsed.title !== 'null') {
          const clean = parsed.title.trim().replace(/^["']|["']$/g, "").slice(0, 60);
          if (clean) updated = { ...updated, title: clean };
        }
        if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
          const questions = parsed.suggestions
            .map((q: string) => String(q).trim())
            .filter((q: string) => q.length > 0)
            .slice(0, 3);
          if (questions.length > 0) {
            updated = { ...updated, messages: c.messages.map(m => m.id === msgId ? { ...m, suggestions: questions } : m) };
          }
        }
        updated = { ...updated, updatedAt: Date.now() };
        return updated;
      }));
    } catch {
      // Silently fail
    }
  };

  // Regenerate: remove last AI response and re-stream a new one
  const handleRegenerate = async () => {
    if (!currentConversation || isLoading) return;
    const msgs = currentConversation.messages;
    if (msgs.length < 1 || msgs[msgs.length - 1].role !== "assistant") return;

    const messagesWithoutLast = msgs.slice(0, -1);
    setConversations((prev) =>
      prev.map((c) => (c.id === currentConversationId ? { ...c, messages: messagesWithoutLast, updatedAt: Date.now() } : c))
    );
    setIsLoading(true);
    setStreamingMessage("");
    setShouldForceScroll(true);

    const apiMessages = messagesWithoutLast.map((m) => ({ role: m.role, content: m.aiContent || m.content }));

  try {
    const { response, aborted } = await runStream(
      currentConversation.model,
      apiMessages,
      currentConversationId,
      getProjectInstructions(currentConversation),
    );
    setStreamingMessage("");
    if (response.trim()) {
      const newMsg: ChatMessageType = { id: generateId(), role: "assistant", content: response, timestamp: Date.now() };
      setConversations((prev) =>
        prev.map((c) => (c.id === currentConversationId ? { ...c, messages: [...messagesWithoutLast, newMsg], updatedAt: Date.now() } : c))
      );
    }
    if (aborted) return;
  } catch {
    setStreamingMessage("");
  }
};

  // Continue: append the AI's previous reply and ask the model to keep going.
  // Useful when a response was cut off mid-sentence or stopped at a token limit.
  const handleContinue = async () => {
    if (!currentConversation || isLoading) return;
    const msgs = currentConversation.messages;
    if (msgs.length < 1 || msgs[msgs.length - 1].role !== "assistant") return;
    const lastAi = msgs[msgs.length - 1];

    setIsLoading(true);
    setStreamingMessage("");
    setShouldForceScroll(true);

    const CONTEXT_WINDOW = 20;
    const windowed = msgs.length > CONTEXT_WINDOW ? msgs.slice(-CONTEXT_WINDOW) : msgs;
    const apiMessages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...windowed.map((m) => ({ role: m.role, content: m.aiContent || m.content })),
      { role: "user", content: "Please continue your previous response from exactly where you left off. Do not repeat content already written." },
    ];

    try {
      const { response, aborted } = await runStream(
        currentConversation.model,
        apiMessages,
        currentConversationId,
        getProjectInstructions(currentConversation),
      );
      setStreamingMessage("");
      if (response.trim()) {
        const joiner = /\s$/.test(lastAi.content) ? "" : " ";
        const merged: ChatMessageType = {
          ...lastAi,
          content: lastAi.content + joiner + response,
          timestamp: Date.now(),
        };
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConversationId
              ? { ...c, messages: [...msgs.slice(0, -1), merged], updatedAt: Date.now() }
              : c
          )
        );
      }
      if (aborted) return;
    } catch {
      setStreamingMessage("");
    }
  };

  // Single unified AI call: detects image intent + extracts subject/count/style/wantsDifferent
  const analyzeImageRequest = async (
    userMessage: string,
    conversationHistory: ChatMessageType[]
  ): Promise<{ isImageRequest: boolean; subject: string; count: number; style: string; wantsDifferent: boolean }> => {
    const recentMessages = conversationHistory.slice(-6);
    let contextText = "";
    if (recentMessages.length > 0) {
      contextText = "\n\nConversation history:\n";
      recentMessages.forEach((msg, idx) => {
        contextText += `${idx + 1}. ${msg.role === "user" ? "User" : "AI"}: ${msg.content.substring(0, 150)}\n`;
      });
    }
    const hadPreviousImages = recentMessages.some(
      m => m.role === "assistant" && m.content.includes("![")
    );

    try {
      const prompt = `Analyze this user message and return ONLY a JSON object — no other text.${contextText}

User message: "${userMessage}"

Determine in ONE response:
1. isImageRequest: Is this a request to see/show/find/generate images/photos?
2. subject: The image subject in English (2-4 keywords). Empty string if not an image request.
3. count: How many images? (1-6, default 1)
4. style: Image style (default "photorealistic")
5. wantsDifferent: ${hadPreviousImages ? "Does the user want DIFFERENT/NEW images from what was already shown?" : "false"}

Rules for isImageRequest=true:
- Direct: "show cats", "اعرض", "صور", "photos", "generate image"
- Implicit: "I want to see X", "what does X look like", "كيف شكل X"
- Continuation if previous messages had images: "more", "different", "المزيد", "غيرها"

Rules for isImageRequest=false:
- Code/programming questions, math, text explanations, concepts

Return ONLY valid JSON:
{"isImageRequest":true,"subject":"cats","count":1,"style":"photorealistic","wantsDifferent":false}`;

      const response = await sendMessage({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        temperature: 0.1,
        max_tokens: 120,
      });

      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isImageRequest: !!parsed.isImageRequest,
          subject: parsed.subject || "",
          count: Math.min(Math.max(Number(parsed.count) || 1, 1), 6),
          style: parsed.style || "photorealistic",
          wantsDifferent: !!parsed.wantsDifferent,
        };
      }
    } catch {
      // Fallback below
    }

    // Fallback: smart regex extraction (image request already pre-confirmed by regex check)
    let subject = userMessage.toLowerCase().trim();
    const wordsToRemove = [
      'show', 'me', 'find', 'search', 'for', 'get', 'display', 'i', 'want', 'to', 'see',
      'give', 'can', 'you', 'fetch', 'look', 'create', 'generate', 'make', 'draw',
      'image', 'images', 'photo', 'photos', 'picture', 'pictures', 'pic', 'pics',
      'of', 'a', 'an', 'the', 'some', 'at', 'what', 'does', 'do', 'how', 'is', 'are',
      'اعرض', 'اجلب', 'ابحث', 'اريد', 'أريد', 'اعطني', 'أعطني', 'احضر', 'وريني',
      'بدي', 'شوف', 'اشوف', 'كيف', 'شكل', 'ما', 'شو',
      'صورة', 'صور', 'صوره', 'لي', 'عن', 'من', 'في', 'ل',
    ];
    wordsToRemove.forEach(word => {
      subject = subject.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
    });
    subject = subject.replace(/\s+/g, ' ').trim();
    const numberMatch = subject.match(/\d+/);
    const count = numberMatch ? Math.min(parseInt(numberMatch[0]), 6) : 1;
    subject = subject.replace(/\d+/g, '').trim();
    if (!subject || subject.length < 2) subject = "nature";

    return { isImageRequest: true, subject, count, style: "photorealistic", wantsDifferent: false };
  };


  const handleImageSearch = async (
    userMessage: string,
    analysis: { subject: string; count: number; style: string; wantsDifferent: boolean }
  ) => {
    // Create or get current conversation
    let workingConversation = currentConversation;
    
    if (!workingConversation) {
      const newConv: Conversation = {
        id: generateId(),
        title: userMessage.slice(0, 50) || "AI Image Generation",
        messages: [],
        model: DEFAULT_MODEL,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      workingConversation = newConv;
      setConversations([newConv, ...conversations]);
      setCurrentConversationId(newConv.id);
    }

    // Add user message
    const userMessageObj: ChatMessageType = {
      id: generateId(),
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    };

    // Update conversation with user message first
    setConversations((prevConvs) => {
      const updated = prevConvs.map((c) => {
        if (c.id === workingConversation!.id) {
          return {
            ...c,
            messages: [...c.messages, userMessageObj],
            title: c.messages.length === 0 ? userMessage.slice(0, 50) || "AI Image Generation" : c.title,
            updatedAt: Date.now(),
          };
        }
        return c;
      });
      
      // If new conversation, add it
      if (!prevConvs.find(c => c.id === workingConversation!.id)) {
        return [{ ...workingConversation!, messages: [userMessageObj] }, ...updated];
      }
      return updated;
    });

    
    // Detect user's language for loading message
    const isArabic = /[\u0600-\u06FF]/.test(userMessage);
    
    setIsLoading(true);
    setStreamingMessage(isArabic ? "🎨 جاري البحث عن صورك..." : "🎨 Searching for your images...");

    try {
      // Use pre-analyzed data — no separate AI calls needed here
      const imageCount = Math.min(Math.max(analysis.count || 1, 1), 6);
      const searchQuery = analysis.subject || "nature";
      const isDifferentRequest = analysis.wantsDifferent;

      // Get the current page for this subject
      const currentPage = currentImagePage.get(searchQuery) || 1;
      const nextPage = isDifferentRequest ? currentPage + 1 : 1;

      // Use isArabic from line 251 for streaming message
      const imageWord = imageCount > 1 ? (isArabic ? 'صور' : 'images') : (isArabic ? 'صورة' : 'image');
      const differentWord = isDifferentRequest ? (isArabic ? 'مختلفة' : 'different') : (isArabic ? 'رائعة' : 'stunning');
      
      setStreamingMessage(
        isArabic 
          ? `🎨 أنشئ ${imageCount} ${imageWord} ${differentWord} لك...`
          : `🎨 Creating ${imageCount} ${differentWord} ${imageWord} for you...`
      );
      
      // Step 2: Generate images using the analyzed query with page number
      const photos = await searchPexelsImages(searchQuery, imageCount, nextPage);

      // Update the page number for this subject
      setCurrentImagePage(prev => new Map(prev).set(searchQuery, nextPage));
      // Store shown image IDs to avoid repeats
      const newShownIds = new Set(shownImageIds);
      photos.forEach(photo => newShownIds.add(photo.id));
      setShownImageIds(newShownIds);

      if (photos.length === 0) {
        throw new Error("No images generated");
      }

      // Step 3: Create professional AI-generated response (using isArabic from above)
      let responseContent = '';
      
      if (isDifferentRequest) {
        // User asked for different/more images
        if (isArabic) {
          responseContent = photos.length === 1 
            ? `✨ **إليك صورة ${searchQuery} مختلفة:**\n\n`
            : `✨ **وجدت لك ${photos.length} صور ${searchQuery} جديدة:**\n\n`;
        } else {
          responseContent = photos.length === 1
            ? `✨ **Here's a different ${searchQuery} for you:**\n\n`
            : `✨ **I found ${photos.length} NEW ${searchQuery} images for you:**\n\n`;
        }
      } else {
        // First time or new subject
        if (isArabic) {
          responseContent = photos.length === 1
            ? `✨ **إليك ما طلبت:**\n\n`
            : `✨ **وجدت لك ${photos.length} صور مثالية:**\n\n`;
        } else {
          responseContent = photos.length === 1
            ? `✨ **Here's what you asked for:**\n\n`
            : `✨ **I found ${photos.length} perfect images for you:**\n\n`;
        }
      }
      
      // Add images with professional presentation
      photos.forEach((photo, index) => {
        if (photos.length > 1) {
          responseContent += isArabic 
            ? `### صورة ${index + 1}\n\n`
            : `### Image ${index + 1}\n\n`;
        }
        responseContent += `![${searchQuery}](${photo.src.large})\n\n`;
      });
      
      // Add professional AI signature in user's language
      responseContent += `---\n\n`;
      
      if (isArabic) {
        responseContent += `**🤖 مدعوم بـ Runner Code AI Vision**\n\n`;
        responseContent += `📊 *التحليل:*\n`;
        responseContent += `• الموضوع: ${searchQuery}\n`;
        responseContent += `• الصور: ${photos.length}${isDifferentRequest ? ' (جديدة/مختلفة)' : ''}\n`;
        responseContent += `• النمط: ${analysis.style === 'photorealistic' ? 'واقعي' : analysis.style}\n\n`;
        responseContent += `💡 *تريد صور مختلفة؟ قل فقط: "بدي غيرها" أو "المزيد" أو "اعرض ${searchQuery} أكثر"*`;
      } else {
        responseContent += `**🤖 Powered by Runner Code AI Vision**\n\n`;
        responseContent += `📊 *Analysis:*\n`;
        responseContent += `• Subject: ${searchQuery}\n`;
        responseContent += `• Images: ${photos.length}${isDifferentRequest ? ' (New/Different)' : ''}\n`;
        responseContent += `• Style: ${analysis.style || 'Photorealistic'}\n\n`;
        responseContent += `💡 *Want different ones? Just say: "different" or "show me more ${searchQuery}"*`;
      }

      const assistantMessage: ChatMessageType = {
        id: generateId(),
        role: "assistant",
        content: responseContent,
        timestamp: Date.now(),
      };

      // Add AI response to conversation
      setConversations((prev) =>
        prev.map((c) =>
          c.id === workingConversation!.id
            ? {
                ...c,
                messages: [...c.messages, assistantMessage],
                updatedAt: Date.now(),
              }
            : c
        )
      );

    } catch (error) {
      const errorContent = `**Runner Code AI Vision** is currently under maintenance.

Please try again in a few moments.`;
      
      const errorMessage: ChatMessageType = {
        id: generateId(),
        role: "assistant",
        content: errorContent,
        timestamp: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === workingConversation!.id
            ? {
                ...c,
                messages: [...c.messages, errorMessage],
                updatedAt: Date.now(),
              }
            : c
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingMessage("");
    }
  };

  const handleSendMessage = async (content: string, images?: File[], pdf?: File) => {
    // Trim and validate input
    const trimmedContent = content.trim();
    if (!trimmedContent && (!images || images.length === 0) && !pdf) {
      return;
    }

    // Force scroll to bottom when user sends a message
    setShouldForceScroll(true);

    // Quick pre-check: Only use AI analysis if there are clear image-related indicators
    if (!images || images.length === 0) {
      const userLower = trimmedContent.toLowerCase().trim();
      
      // Fast pattern check for obvious image requests
      const obviousImageWords = /\b(image|photo|picture|pic|صورة|صور|show me|اعرض|generate|create|انشئ|اصنع|draw|ارسم)\b/i;
      const hasRecentImages = currentConversation?.messages.some(msg => 
        msg.role === "assistant" && (msg.content.includes("![") || msg.content.includes("Powered by Runner Code AI Vision"))
      );
      const continueWords = /\b(more|another|different|المزيد|غيرها|كمل)\b/i;
      
      // Only run AI analysis if there's a strong indicator
      const shouldCheckWithAI = obviousImageWords.test(userLower) || 
                                (hasRecentImages && continueWords.test(userLower));
      
      if (shouldCheckWithAI) {
        try {
          const conversationHistory = currentConversation?.messages || [];
          const analysis = await analyzeImageRequest(trimmedContent, conversationHistory);

          if (analysis.isImageRequest) {
            await handleImageSearch(trimmedContent, analysis);
            return;
          }
        } catch (error) {
          // Continue with normal message flow if AI check fails
        }
      }
    }

    // Create or get current conversation
    let workingConversation = currentConversation;
    
    if (!workingConversation) {
      // Create new conversation directly
      const newConv: Conversation = {
        id: generateId(),
        title: trimmedContent.slice(0, 50) || (images && images.length > 0 ? "Image Analysis" : pdf ? "PDF Analysis" : "New Chat"),
        messages: [],
        model: pendingModel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      workingConversation = newConv;
      setConversations([newConv, ...conversations]);
      setCurrentConversationId(newConv.id);
    }

    // Convert images to base64 if provided
    let imagesBase64: string[] = [];
    if (images && images.length > 0) {
      try {
        const imagePromises = images.map(image => 
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(image);
          })
        );
        imagesBase64 = await Promise.all(imagePromises);
      } catch (error) {
        // Error converting images to base64
      }
    }

    // Extract text from PDF if provided
    let pdfBase64 = "";
    let pdfText = "";
    if (pdf) {
      try {
        // Show loading state in chat
        setIsLoading(true);
        setStreamingMessage("📄 Reading PDF pages...");
        
        // Extract text from PDF
        pdfText = await extractTextFromPDF(pdf);
        
        // Update message to show processing
        setStreamingMessage("📄 Processing document content...");
        
        // Also create base64 for display purposes
        pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(pdf);
        });
        
        setIsLoading(false);
        setStreamingMessage("");
        
        // Check if we got any text
        if (!pdfText || pdfText === 'No text content found in PDF') {
          // PDF might be image-based, let user know
          pdfText = `[This PDF file named "${pdf.name}" was uploaded. Note: The PDF appears to be image-based or has no extractable text. If you have questions about its content, please describe what you need help with.]`;
        }
      } catch (error) {
        // Error processing PDF
        setIsLoading(false);
        setStreamingMessage("");
        
        // Don't block the user - still allow them to send a message about the PDF
        pdfText = `[A PDF file named "${pdf.name}" was uploaded, but there was an error reading its content. You can still ask questions about PDFs in general, or describe what you need help with.]`;
      }
    }

    // Prepare message content for display (what user sees in chat)
    let displayContent = trimmedContent || (pdf ? "Please analyze this PDF document" : (images && images.length > 0) ? (images.length === 1 ? "What's in this image?" : `Analyze these ${images.length} images`) : "");
    
    // Prepare message content for AI (includes PDF text in background)
    let aiMessageContent = "";
    if (pdf && pdfText) {
      // Format PDF text for AI (sent in background)
      const formattedPDF = formatPDFTextForAI(pdfText, pdf.name);
      
      if (trimmedContent) {
        // User asked a specific question
        aiMessageContent = `${formattedPDF}

${trimmedContent}`;
      } else {
        // User just uploaded PDF without a question
        aiMessageContent = `${formattedPDF}

Please provide a helpful summary of this document.`;
      }
    } else if (images && images.length > 0) {
      aiMessageContent = trimmedContent || (images.length === 1 ? "Analyze this image in detail. Describe what you see." : `Analyze these ${images.length} images in detail. Describe what you see in each image and any relationships between them.`);
      if (imagesBase64.length === 0) {
        const imageNames = images.map(img => img.name).join(', ');
        aiMessageContent += `\n\n[Images: ${imageNames}]`;
      }
    } else {
      aiMessageContent = trimmedContent;
    }

    const userMessage: ChatMessageType = {
      id: generateId(),
      role: "user",
      content: displayContent, // Only show user's question in chat
      timestamp: Date.now(),
      imageUrl: imagesBase64.length === 1 ? imagesBase64[0] : undefined, // Legacy single image support
      imageUrls: imagesBase64.length > 0 ? imagesBase64 : undefined, // Store all images for display
      pdfUrl: pdfBase64 || undefined, // Store PDF for display
      aiContent: ((pdf && pdfText) || (images && images.length > 0)) ? aiMessageContent : undefined, // Store full content for AI (PDF or images)
    };

    // Update conversation with user message
    const updatedConversation = {
      ...workingConversation,
      messages: [...workingConversation.messages, userMessage],
      title:
        workingConversation.messages.length === 0
          ? trimmedContent.slice(0, 50) || "New Chat"
          : workingConversation.title,
      updatedAt: Date.now(),
    };

    setConversations((prevConvs) =>
      prevConvs.map((c) =>
        c.id === workingConversation!.id ? updatedConversation : c
      )
    );

    // If PDF was uploaded, show analyzing message
    if (pdf && pdfText) {
      setIsLoading(true);
      setStreamingMessage("📄 Analyzing PDF document...");
      
      // Small delay to show the analyzing message
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      setIsLoading(true);
      setStreamingMessage("");
    }

    // Hoist wasFirstMessage before try so catch can access it
    const wasFirstMessage = workingConversation.messages.length === 0;

    try {
      // Sliding context window: keep last 20 messages to reduce latency and token cost
      const CONTEXT_WINDOW = 20;
      const allMsgs = updatedConversation.messages;
      const windowedMsgs = allMsgs.length > CONTEXT_WINDOW
        ? allMsgs.slice(-CONTEXT_WINDOW)
        : allMsgs;

      // Prepare messages with image and PDF support
      const messages = windowedMsgs.map((m, index) => {
        // Use aiContent if available (for PDF messages), otherwise use regular content
        const contentToSend = m.aiContent || m.content;
        
        // Only include images for the CURRENT message being sent (last message)
        // Previous messages with images should be sent as text descriptions to save tokens
        const isCurrentMessage = index === windowedMsgs.length - 1;
        
        // For current message, use the new images being uploaded
        if (isCurrentMessage && imagesBase64.length > 0) {
          const textContent = contentToSend || (imagesBase64.length === 1 
            ? "Analyze this image in detail. Describe what you see." 
            : `Analyze these ${imagesBase64.length} images in detail. Describe what you see in each image and any relationships between them.`);
          
          // Create content array with text first, then all images
          const contentArray: Array<{type: "text"; text: string} | {type: "image_url"; image_url: {url: string}}> = [
            {
              type: "text" as const,
              text: textContent as string,
            },
          ];
          
          // Add all images to the content array
          imagesBase64.forEach((imageUrl) => {
            contentArray.push({
              type: "image_url" as const,
              image_url: {
                url: imageUrl,
              },
            });
          });
          
          return {
            role: m.role,
            content: contentArray,
          };
        }
        
        // For previous messages that had images, just send the text content
        // (the AI already analyzed those images in previous turns)
        if (m.role === "user" && (m.imageUrls || m.imageUrl)) {
          // Include a note that images were shared previously
          const imageCount = m.imageUrls?.length || (m.imageUrl ? 1 : 0);
          const imageNote = imageCount > 0 ? `\n[Note: ${imageCount} image(s) were shared and analyzed in this message]` : '';
          return {
            role: m.role,
            content: (contentToSend || "Shared images for analysis") + imageNote,
          };
        }
        
        if (m.role === "user" && contentToSend.includes("[Image")) {
          return {
            role: m.role,
            content: contentToSend.replace(/\[Image[s]?:.*?\]/g, "").trim(),
          };
        }
        
        return {
          role: m.role,
          content: contentToSend,
        };
      });

      const { response, aborted } = await runStream(
        updatedConversation.model,
        messages,
        updatedConversation.id,
        getProjectInstructions(updatedConversation),
      );
      setStreamingMessage("");

      if (aborted) {
        if (response.trim()) {
          const partialMessage: ChatMessageType = {
            id: generateId(),
            role: "assistant",
            content: response,
            timestamp: Date.now(),
          };
          setConversations((prev) =>
            prev.map((c) =>
              c.id === workingConversation!.id
                ? { ...c, messages: [...c.messages, partialMessage], updatedAt: Date.now() }
                : c
            )
          );
        }
        return;
      }

      const assistantMessage: ChatMessageType = {
        id: generateId(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === workingConversation!.id
            ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: Date.now() }
            : c
        )
      );

      // One AI call generates both title (if first message) and follow-up suggestions
      generateTitleAndSuggestions(trimmedContent, response, workingConversation!.id, assistantMessage.id, wasFirstMessage);
    } catch (error) {
      const userFriendlyMessage = `**Runner Code AI Model** is currently under maintenance.\n\nPlease try again in a few moments.`;

      const errorMessage: ChatMessageType = {
        id: generateId(),
        role: "assistant",
        content: userFriendlyMessage,
        timestamp: Date.now(),
      };

      setStreamingMessage("");
      setConversations((prev) =>
        prev.map((c) =>
          c.id === workingConversation!.id
            ? { ...c, messages: [...c.messages, errorMessage], updatedAt: Date.now() }
            : c
        )
      );
    }
  };

  // Auth guard — must be after all hooks
  if (authLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Show CountryModal for new Google users before they're saved to DB
    if (pendingSetup) return <CountryModal />;
    return authView === "register" ? (
      <RegisterPage onSwitchToLogin={() => setAuthView("login")} />
    ) : (
      <LoginPage onSwitchToRegister={() => setAuthView("register")} />
    );
  }

  // Block access if existing Google user somehow has no country
  if (!user.country) {
    return <CountryModal />;
  }

  // Post-auth professional loader screen
  if (showLoader && !loaderDone) {
    return (
      <LoaderScreen
        userName={user.name}
        theme={theme}
        onDone={() => {
          setLoaderDone(true);
          setShowLoader(false);
          // Welcome toast — friendly greeting after a fresh login or registration.
          const firstName = user?.name?.trim().split(/\s+/)[0];
          if (firstName) showToast(`Welcome, ${firstName}!`);
        }}
      />
    );
  }

  // Sign-out / Delete-account loaders — must be above currentView guards
  if (showSignOutLoader) {
    return <SignOutLoader onDone={() => { setShowSignOutLoader(false); logout(); }} />;
  }
  if (showDeleteAccountLoader) {
    return <DeleteAccountLoader onDone={() => { setShowDeleteAccountLoader(false); logout(); }} />;
  }

  if (currentView === "profile") {
    return (
      <ProfilePage
        onBack={() => setCurrentView("chat")}
        onSignOut={handleSignOut}
        onDeleteAccount={() => { setCurrentView("chat"); setShowDeleteAccountLoader(true); }}
        conversations={conversations}
      />
    );
  }

  if (currentView === "settings") {
    return (
      <SettingsPage
        onBack={() => setCurrentView("chat")}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  if (currentView === "contact") {
    return <ContactPage onBack={() => setCurrentView("chat")} />;
  }

  if (currentView === "messages") {
    return (
      <AdminMessagesPanel
        onBack={() => setCurrentView("chat")}
        onMessagesRead={() => setUnreadAdminMessages(0)}
      />
    );
  }

  return (
    <div className="flex h-[100dvh] lg:h-screen bg-background text-foreground overflow-hidden safe-area-inset">
      {/* ── Mobile overlay backdrop ─────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 touch-none ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* ── Mobile sidebar drawer (overlay) ─────────────────────── */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          projects={projects}
          currentProjectId={currentProjectId}
          onOpenProject={(id) => { handleOpenProject(id); setIsSidebarOpen(false); }}
          onCreateProject={() => { setIsNewProjectModalOpen(true); setIsSidebarOpen(false); }}
          onMoveConversationToProject={handleMoveConversationToProject}
          onSignOut={handleSignOut}
          onDeleteAccount={() => setShowDeleteAccountLoader(true)}
          onOpenProfile={() => { setCurrentView("profile"); setIsSidebarOpen(false); }}
          onOpenSettings={() => { setCurrentView("settings"); setIsSidebarOpen(false); }}
          onOpenContact={() => { setCurrentView("contact"); setIsSidebarOpen(false); }}
          onOpenAdminMessages={() => { setCurrentView("messages"); setIsSidebarOpen(false); }}
          onCloseSidebar={() => setIsSidebarOpen(false)}
          unreadReplies={unreadReplies}
          unreadAdminMessages={unreadAdminMessages}
          onNewChat={() => { handleNewChat(); setIsSidebarOpen(false); }}
          onSelectConversation={(id) => { handleSelectConversation(id); setIsSidebarOpen(false); }}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onTogglePin={handleTogglePin}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          footerHeight={chatInputHeight}
        />
      </div>

      {/* ── Desktop sidebar (collapsible: full 320px ↔ mini-rail 56px) ── */}
      <div
        className="hidden lg:block flex-shrink-0 overflow-hidden transition-[width] duration-300 relative"
        style={{
          width: isSidebarOpen ? "320px" : "56px",
          transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Full sidebar — fades out when collapsed */}
        <div
          className={`absolute inset-0 w-[320px] h-full transition-opacity duration-200 ${
            isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Sidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            projects={projects}
            currentProjectId={currentProjectId}
            onOpenProject={handleOpenProject}
            onCreateProject={() => setIsNewProjectModalOpen(true)}
            onMoveConversationToProject={handleMoveConversationToProject}
            onSignOut={handleSignOut}
            onDeleteAccount={() => setShowDeleteAccountLoader(true)}
            onOpenProfile={() => setCurrentView("profile")}
            onOpenSettings={() => setCurrentView("settings")}
            onOpenContact={() => setCurrentView("contact")}
            onOpenAdminMessages={() => { setCurrentView("messages"); setIsSidebarOpen(false); }}
            onCloseSidebar={toggleSidebar}
            unreadReplies={unreadReplies}
            unreadAdminMessages={unreadAdminMessages}
            onNewChat={() => handleNewChat()}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
            onTogglePin={handleTogglePin}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            footerHeight={chatInputHeight}
          />
        </div>

        {/* Mini rail — fades in when collapsed (Claude-style) */}
        <div
          className={`absolute inset-0 w-[56px] h-full flex flex-col items-center justify-between py-3 bg-card border-r border-border transition-opacity duration-200 ${
            isSidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100 delay-150"
          }`}
        >
          {/* Top icons */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={toggleSidebar}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Open sidebar"
              title="Open sidebar (Ctrl+B)"
            >
              <PanelLeft className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => handleNewChat()}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
              aria-label="New chat"
              title="New chat"
            >
              <Plus className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
              aria-label="New project"
              title="New project"
            >
              <FolderPlus className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={toggleSidebar}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Search"
              title="Search conversations"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => setCurrentView("messages")}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Inbox"
              title="Inbox"
            >
              <InboxIcon className="w-[18px] h-[18px]" />
              {unreadAdminMessages > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
            <button
              onClick={() => setCurrentView("contact")}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Support"
              title="Support"
            >
              <HeadphonesIcon className="w-[18px] h-[18px]" />
              {unreadReplies > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
          </div>

          {/* Bottom avatar */}
          <button
            onClick={() => setCurrentView("profile")}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold border border-primary/25 hover:bg-primary/25 transition-colors"
            aria-label="My Profile"
            title={user?.name || "My Profile"}
          >
            {(user?.name?.trim().charAt(0) || "A").toUpperCase()}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative min-h-0">

        {/* ── Mobile Header ─────────────────────────────── */}
        <div className="lg:hidden sticky top-0 z-30 bg-background border-b border-border shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          {/* Row 1 – nav + app name + export */}
          <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex-shrink-0 hover:bg-primary/10 rounded-xl transition-all touch-manipulation min-w-[40px] min-h-[40px]"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-sm font-bold">Runner Code AI</span>
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
            </div>
            {currentConversation && currentConversation.messages.length > 0 && (
              <button
                onClick={handleExportMarkdown}
                className="p-2 rounded-lg hover:bg-muted/80 transition-colors touch-manipulation flex-shrink-0"
                title="Export as Markdown"
                aria-label="Export conversation"
              >
                <Download className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {currentConversationProject && (
            <button
              onClick={() => handleOpenProject(currentConversationProject.id)}
              className="w-full flex items-center gap-2 px-3 pb-2 pt-0 text-left"
              title={`Open project: ${currentConversationProject.name}`}
            >
              <span
                className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ backgroundColor: currentConversationProject.color }}
              >
                <FolderOpen className="w-2.5 h-2.5 text-white drop-shadow-sm" />
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">In</span>
              <span className="text-[11px] font-semibold text-foreground truncate">
                {currentConversationProject.name}
              </span>
            </button>
          )}
        </div>

        {/* ── Desktop Header ────────────────────────────── */}
        <div className="hidden lg:flex items-center justify-between px-5 py-2 border-b border-border/40 bg-background/80 backdrop-blur-sm flex-shrink-0 gap-3">
          {/* Left: project breadcrumb (when chat belongs to a project) */}
          <div className="flex items-center gap-2 min-w-0">
            {currentConversationProject && (
              <button
                onClick={() => handleOpenProject(currentConversationProject.id)}
                className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/50 hover:border-border bg-card/60 hover:bg-card transition-all min-w-0"
                title={`Open project: ${currentConversationProject.name}`}
              >
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: currentConversationProject.color }}
                >
                  <FolderOpen className="w-3 h-3 text-white drop-shadow-sm" />
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">In</span>
                <span className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                  {currentConversationProject.name}
                </span>
              </button>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {currentConversation && currentConversation.messages.length > 0 && (
              <button
                onClick={handleExportMarkdown}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg border border-border/50 hover:border-border hover:bg-muted/50 transition-all flex-shrink-0"
                title="Export as Markdown (Ctrl+Shift+E)"
              >
                <Download className="w-3.5 h-3.5" />
                Export .md
              </button>
            )}
          </div>
        </div>

        {currentProjectId && !currentConversation ? (
          (() => {
            const proj = projects.find(p => p.id === currentProjectId);
            return proj ? (
              <ProjectView
                project={proj}
                conversations={conversations}
                onBack={() => setCurrentProjectId(null)}
                onUpdateProject={handleUpdateProject}
                onDeleteProject={handleDeleteProject}
                onNewChatInProject={(pid) => handleNewChat(pid)}
                onOpenConversation={handleSelectConversation}
                onRemoveConversationFromProject={(cid) => handleMoveConversationToProject(cid, null)}
              />
            ) : null;
          })()
        ) : !currentConversation || currentConversation.messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={handleSendMessage} />
        ) : (
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 safe-area-bottom">
            {currentConversation.messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                onEdit={handleEditMessage}
                onToast={showToast}
                isLastMessage={index === currentConversation.messages.length - 1 && !isStreamingHere}
                onSuggestionClick={(q) => handleSendMessage(q)}
                onOpenArtifact={setCurrentArtifact}
                savedReaction={reactions.get(message.id) ?? null}
                onReaction={handleReaction}
              />
            ))}

            {/* Regenerate button — appears after last AI response when idle */}
            {!isStreamingHere &&
              currentConversation.messages.length > 0 &&
              currentConversation.messages[currentConversation.messages.length - 1].role === "assistant" && (
              <div className="flex justify-center py-2 gap-2 flex-wrap">
                <button
                  onClick={handleContinue}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border px-3 py-1.5 rounded-lg transition-all hover:bg-muted/50"
                  title="Ask the AI to continue from where it stopped"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Continue
                </button>
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border px-3 py-1.5 rounded-lg transition-all hover:bg-muted/50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate response
                </button>
              </div>
            )}
              {isStreamingHere && (
                <div className="flex gap-2 sm:gap-3 p-3 sm:p-4 md:p-6 bg-card/50">
                <div className="flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground animate-spin" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                    {streamingMessage ? (
                      <div className="max-w-none text-xs sm:text-sm md:text-base text-foreground leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2 text-foreground">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-bold mt-3 mb-2 text-foreground">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-semibold mt-2 mb-1 text-foreground">{children}</h3>,
                            h4: ({ children }) => <h4 className="text-base font-semibold mt-2 mb-1 text-foreground">{children}</h4>,
                            p: ({ children }) => <div className="mb-2 leading-relaxed">{children}</div>,
                            ul: ({ children }) => <ul className="list-disc list-outside ml-5 mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-outside ml-5 mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                            em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/60 pl-4 my-2 italic text-muted-foreground">{children}</blockquote>,
                            hr: () => <hr className="border-border my-4" />,
                            a: ({ href, children }) => <a href={href} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">{children}</a>,
                            code: ({ inline, className, children }: any) => {
                              const codeStr = String(children).replace(/\n$/, "");
                              const langMatch = /language-(\w+)/.exec(className || "");
                              if (!inline) {
                                return (
                                  <div className="my-3 rounded-xl overflow-hidden border border-border/50 shadow-md">
                                    {langMatch && (
                                      <div className="flex items-center gap-2 bg-[#1e1e1e] px-4 py-2 border-b border-gray-700/50">
                                        <div className="w-3 h-3 rounded-full bg-destructive/80" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                        <span className="text-xs font-mono text-gray-400 ml-1">{langMatch[1]}</span>
                                      </div>
                                    )}
                                    <pre className="bg-[#1e1e1e] p-4 overflow-x-auto">
                                      <code className="text-sm font-mono text-gray-200 whitespace-pre">{codeStr}</code>
                                    </pre>
                                  </div>
                                );
                              }
                              return <code className="bg-muted/60 text-primary px-1.5 py-0.5 rounded text-[0.85em] font-mono">{codeStr}</code>;
                            },
                          }}
                        >
                          {closeOpenCodeFences(streamingMessage)}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        {/* Wave typing dots */}
                        <div className="flex gap-1.5 items-end h-5">
                          {[0, 160, 320].map((delay) => (
                            <div
                              key={delay}
                              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary shadow-[0_0_6px_1px_rgba(227,30,36,0.5)]"
                              style={{ animation: `typing-wave 1.4s ease-in-out infinite`, animationDelay: `${delay}ms` }}
                            />
                          ))}
                        </div>
                        <span className="text-xs sm:text-sm font-medium">
                          {AVAILABLE_MODELS.find(m => m.id === (currentConversation?.model || DEFAULT_MODEL))?.name ?? "Runner Code AI"}
                          <span className="text-muted-foreground/60"> is thinking…</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Stop generation button */}
              {isStreamingHere && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={handleStopGeneration}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border px-3 py-1.5 rounded-lg transition-all hover:bg-muted/50"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    Stop generating
                  </button>
                </div>
              )}
              {/* Spacing at bottom for mobile keyboard */}
              <div className="h-4 sm:h-6 md:h-8"></div>
              </div>
          </div>
        )}

        {/* Scroll-to-bottom floating button */}
        {isScrolledUp && currentConversation && currentConversation.messages.length > 0 && (
          <div className="absolute bottom-[76px] sm:bottom-[84px] right-3 sm:right-5 z-20">
            <button
              onClick={scrollToBottom}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:shadow-primary/20 hover:border-primary/40 hover:scale-110 active:scale-95 transition-all touch-manipulation"
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}
        <div ref={chatInputWrapRef} style={{ display: currentProjectId && !currentConversation ? "none" : undefined }}>
          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading}
            onToast={showToast}
            conversationId={currentConversationId}
            initialDraft={currentConversation?.draft ?? ""}
            onDraftChange={handleDraftChange}
            onNewChat={() => handleNewChat()}
            onClearChat={handleClearChat}
            onExport={handleExportMarkdown}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            isStreaming={isLoading}
            onStop={handleStopGeneration}
            modelSelectorSlot={
              <ModelSelector
                value={currentConversation?.model || pendingModel}
                onChange={handleChangeModel}
                disabled={isLoading}
                compact
              />
            }
          />
        </div>
      </div>

      {/* ── Artifacts Panel — desktop side panel ── */}
      {currentArtifact && (
        <div className="hidden lg:flex flex-col w-[46%] xl:w-[44%] 2xl:w-[42%] min-w-[360px] max-w-[720px] flex-shrink-0 border-l border-border/40 shadow-[-4px_0_24px_rgba(0,0,0,0.08)] animate-in slide-in-from-right-3 duration-250">
          <ArtifactsPanel artifact={currentArtifact} onClose={() => setCurrentArtifact(null)} />
        </div>
      )}

      {/* ── Artifacts Panel — mobile/tablet bottom sheet ── */}
      {currentArtifact && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setCurrentArtifact(null)}
          />
          {/* Sheet — takes 90% of screen height */}
          <div className="h-[90dvh] bg-background rounded-t-2xl border-t border-border/50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 safe-area-bottom">
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border/60" />
            </div>
            <ArtifactsPanel artifact={currentArtifact} onClose={() => setCurrentArtifact(null)} />
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-right-4 fade-in pointer-events-auto max-w-xs ${
              toast.type === "error"
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-card border-border text-foreground"
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
              <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>

      <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onCreate={(name, color) => { setIsNewProjectModalOpen(false); handleCreateProject(name, color); }}
        onCancel={() => setIsNewProjectModalOpen(false)}
      />
    </div>
  );
}
