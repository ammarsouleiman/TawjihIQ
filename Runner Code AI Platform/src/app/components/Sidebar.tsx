import { ChevronDown, ChevronUp, FolderClosed, FolderOpen, FolderPlus, Headphones, Inbox, LogOut, MessageSquare, Moon, PanelLeftClose, Pin, PinOff, Plus, Search, Settings, Sun, Trash2, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import logo from "../../assets/3546325734eebbae935ba64a28db9c350a382fdd.png";
import { useAuth } from "../context/AuthContext";
import { Conversation, Project } from "../types/chat";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  /** All projects belonging to the current user. */
  projects: Project[];
  /** Project whose landing page is currently open (null when on a chat). */
  currentProjectId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onTogglePin?: (id: string) => void;
  /** Open a project's landing page. */
  onOpenProject: (id: string) => void;
  /** Create a new (empty) project and open it. */
  onCreateProject: () => void;
  /** Drag-drop: assign a conversation to a project, or detach (null). */
  onMoveConversationToProject: (convId: string, projectId: string | null) => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenContact?: () => void;
  onOpenAdminMessages?: () => void;
  /** Collapse the sidebar (used by the close button inside the header). */
  onCloseSidebar?: () => void;
  /** Unread admin replies — shown as a small badge on the Profile button. */
  unreadReplies?: number;
  /** Unread direct admin messages — shown on the Messages button. */
  unreadAdminMessages?: number;
  /** Exact pixel height to match (e.g. the ChatInput container) so the
   *  footer's top border aligns with the chat input's top border. */
  footerHeight?: number;
}

export function Sidebar({
  conversations,
  currentConversationId,
  projects,
  currentProjectId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePin,
  onOpenProject,
  onCreateProject,
  onMoveConversationToProject,
  onSignOut,
  onDeleteAccount: _onDeleteAccount,
  onOpenProfile,
  onOpenSettings,
  onOpenContact,
  onOpenAdminMessages,
  onCloseSidebar,
  theme,
  onToggleTheme,
  unreadReplies = 0,
  unreadAdminMessages = 0,
  footerHeight,
}: SidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const { user, logout: _logout } = useAuth();
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  // Drag-drop: tracks which project (if any) is being hovered while dragging
  // a conversation chip, so we can highlight the drop target.
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [draggingConvId, setDraggingConvId] = useState<string | null>(null);
  const draggingConvIdRef = useRef<string | null>(null);

  // Per-project explicit override map. `true` = user forced open, `false` = user
  // forced closed, `undefined` = follow auto-expand (active project or contains
  // the currently-open chat). Lets the user collapse a project even while a chat
  // inside it is open.
  const [expandOverride, setExpandOverride] = useState<Record<string, boolean>>({});
  const toggleProjectExpanded = (id: string, currentlyExpanded: boolean) => {
    setExpandOverride((prev) => ({ ...prev, [id]: !currentlyExpanded }));
  };

  // Close user menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isUserMenuOpen]);

  // Helper function to get initials (first and last letter)
  const getInitials = (fullName: string): string => {
    const trimmed = fullName.trim();
    if (!trimmed) return "";
    
    const words = trimmed.split(/\s+/).filter(word => word.length > 0);
    if (words.length === 0) return "";
    
    if (words.length === 1) {
      // If only one word, return first and last letter of that word
      const word = words[0];
      if (word.length === 1) return word.toUpperCase();
      return (word[0] + word[word.length - 1]).toUpperCase();
    }
    
    // If multiple words, return first letter of first word and first letter of last word
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const formatRelativeTime = (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return new Date(ts).toLocaleDateString('en-US', { weekday: 'short' });
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Date grouping (matches ChatGPT-style sectioning)
  type DateGroupKey = "pinned" | "today" | "yesterday" | "week" | "month" | "older";
  const GROUP_LABELS: Record<DateGroupKey, string> = {
    pinned: "Pinned",
    today: "Today",
    yesterday: "Yesterday",
    week: "Previous 7 Days",
    month: "Previous 30 Days",
    older: "Older",
  };
  const GROUP_ORDER: DateGroupKey[] = ["pinned", "today", "yesterday", "week", "month", "older"];

  const getDateGroup = (ts: number): Exclude<DateGroupKey, "pinned"> => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86_400_000;
    const startOfWeek = startOfToday - 7 * 86_400_000;
    const startOfMonth = startOfToday - 30 * 86_400_000;
    if (ts >= startOfToday) return "today";
    if (ts >= startOfYesterday) return "yesterday";
    if (ts >= startOfWeek) return "week";
    if (ts >= startOfMonth) return "month";
    return "older";
  };

  const filteredConversations = conversations.filter(c =>
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // "Recents" only shows conversations that are NOT inside a project (project
  // conversations live inside their project's landing page, matching Claude).
  // When the user is actively searching, ignore the filter so they can find
  // any conversation including project ones by name.
  const recentsConversations = searchQuery
    ? filteredConversations
    : filteredConversations.filter(c => !c.projectId);

  const groupedConversations = (() => {
    const map = new Map<DateGroupKey, Conversation[]>();
    for (const conv of recentsConversations) {
      const key: DateGroupKey = conv.pinned ? "pinned" : getDateGroup(conv.updatedAt);
      const arr = map.get(key) ?? [];
      arr.push(conv);
      map.set(key, arr);
    }
    map.forEach(arr => arr.sort((a, b) => b.updatedAt - a.updatedAt));
    return GROUP_ORDER
      .filter(k => map.has(k))
      .map(k => ({ key: k, label: GROUP_LABELS[k], items: map.get(k)! }));
  })();

  const handleDeleteClick = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent conversation selection
    setConversationToDelete(conv);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      setDeletingId(conversationToDelete.id);
      onDeleteConversation(conversationToDelete.id);
      setDeletingId(null);
      setShowDeleteModal(false);
      setConversationToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  return (
    <div className="w-[280px] sm:w-[300px] lg:w-[320px] bg-sidebar border-r border-sidebar-border flex flex-col h-[100dvh] lg:h-screen shadow-xl safe-area-inset safe-area-top">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <img 
              src={logo} 
              alt="Runner Code" 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex-shrink-0 ring-2 ring-primary/20" 
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-sidebar"></div>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold text-sidebar-foreground truncate">
              Runner Code
            </h1>
            <p className="text-xs text-muted-foreground font-medium">AI Assistant</p>
          </div>
          {/* Collapse button — desktop only, cleanly integrated into the header row */}
          {onCloseSidebar && (
            <button
              onClick={onCloseSidebar}
              className="hidden lg:flex flex-shrink-0 items-center justify-center w-9 h-9 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-all duration-200"
              aria-label="Collapse sidebar"
              title="Collapse sidebar (Ctrl+B)"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          onClick={onNewChat}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base font-semibold py-2.5 sm:py-3 rounded-xl shadow-lg hover:shadow-primary/20 transition-all duration-200 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          New Chat
          <span className="ml-auto text-[9px] font-normal opacity-60 hidden sm:inline">Ctrl+K</span>
        </Button>
      </div>

      {/* Search Box */}
      {conversations.length > 2 && (
        <div className="px-3 pb-2 pt-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-background/60 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Conversations List */}
      <ScrollArea className="flex-1 min-h-0 px-2 py-3">
        {/* Projects section — Claude-style folders */}
        <div className="mb-4">
          <div className="px-2 pb-2 pt-1 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
              Projects
            </span>
            <button
              onClick={onCreateProject}
              className="flex items-center gap-1.5 px-2 py-1.5 min-w-[32px] min-h-[32px] rounded-lg text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 shadow-sm hover:shadow-primary/20 active:scale-95 transition-all touch-manipulation"
              title="New project"
              aria-label="New project"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
          {projects.length === 0 ? (
            <button
              onClick={onCreateProject}
              className="group w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/50 border border-dashed border-border/60 hover:border-border rounded-xl transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <FolderPlus className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-foreground/80 group-hover:text-foreground leading-tight">
                  Create a project
                </p>
                <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5">
                  Group chats with shared instructions
                </p>
              </div>
            </button>
          ) : (
            <div className="space-y-1">
              {projects.map((proj) => {
                const projConvs = conversations
                  .filter((c) => c.projectId === proj.id)
                  .sort((a, b) => b.updatedAt - a.updatedAt);
                const projConvCount = projConvs.length;
                const isActive = currentProjectId === proj.id;
                const containsActiveChat = projConvs.some((c) => c.id === currentConversationId);
                const isDragOver = dragOverProjectId === proj.id;
                const autoExpanded = isActive || containsActiveChat;
                const isExpanded = expandOverride[proj.id] ?? autoExpanded;
                return (
                  <div
                    key={proj.id}
                    onDragOver={(e) => {
                      if (draggingConvIdRef.current) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverProjectId !== proj.id) setDragOverProjectId(proj.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverProjectId === proj.id) setDragOverProjectId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const convId = draggingConvIdRef.current || e.dataTransfer.getData("text/conversation-id");
                      if (convId) onMoveConversationToProject(convId, proj.id);
                      setDragOverProjectId(null);
                      draggingConvIdRef.current = null;
                    }}
                    className={`relative rounded-xl transition-all duration-200 ${
                      isDragOver
                        ? "ring-2 ring-primary/70 ring-offset-1 ring-offset-sidebar bg-primary/5"
                        : ""
                    }`}
                  >
                    {/* Header row */}
                    <div
                      className={`group flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-all duration-200 ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleProjectExpanded(proj.id, isExpanded)}
                        className="p-0.5 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-background/40 transition-colors flex-shrink-0"
                        aria-label={isExpanded ? "Collapse project" : "Expand project"}
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? "rotate-0" : "-rotate-90"
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenProject(proj.id)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                        title={proj.name}
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105"
                          style={{ backgroundColor: proj.color }}
                        >
                          {isExpanded ? (
                            <FolderOpen className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                          ) : (
                            <FolderClosed className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                          )}
                        </span>
                        <span className="flex-1 min-w-0 text-sm font-medium truncate">
                          {proj.name}
                        </span>
                        {projConvCount > 0 && (
                          <span
                            className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md transition-colors ${
                              isActive
                                ? "bg-background/40 text-foreground"
                                : "bg-muted/50 text-muted-foreground/80 group-hover:bg-muted"
                            }`}
                          >
                            {projConvCount}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Nested chats inside the project */}
                    {isExpanded && (
                      <div className="relative pl-3 ml-4 mt-1 mb-1 space-y-0.5 border-l-2 animate-in fade-in slide-in-from-top-1 duration-150"
                        style={{ borderColor: `${proj.color}55` }}
                      >
                        {projConvs.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground/60 italic px-2 py-1.5">
                            No chats yet — drag one here.
                          </p>
                        ) : (
                          projConvs.map((conv) => {
                            const isActiveChat = conv.id === currentConversationId;
                            return (
                              <button
                                key={conv.id}
                                type="button"
                                onClick={() => onSelectConversation(conv.id)}
                                draggable
                                onDragStart={(e) => {
                                  draggingConvIdRef.current = conv.id;
                                  setDraggingConvId(conv.id);
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData("text/conversation-id", conv.id);
                                }}
                                onDragEnd={() => {
                                  draggingConvIdRef.current = null;
                                  setDraggingConvId(null);
                                  setDragOverProjectId(null);
                                }}
                                className={`group/chat w-full min-w-0 flex items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-all duration-150 ${
                                  draggingConvId === conv.id
                                    ? "opacity-40 cursor-grabbing"
                                    : isActiveChat
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm font-semibold"
                                    : "hover:bg-sidebar-accent/40 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                                }`}
                                title={conv.title}
                              >
                                <MessageSquare
                                  className={`w-3 h-3 mt-0.5 flex-shrink-0 transition-colors ${
                                    isActiveChat ? "text-primary" : "text-muted-foreground/60 group-hover/chat:text-foreground"
                                  }`}
                                />
                                <span className="flex-1 min-w-0 text-[12px] leading-snug break-words whitespace-normal line-clamp-2">
                                  {conv.title}
                                </span>
                                {isActiveChat && (
                                  <span className="w-1.5 h-1.5 mt-1 rounded-full bg-primary flex-shrink-0 shadow-[0_0_6px_1px_rgba(227,30,36,0.6)]" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {conversations.length === 0 || (recentsConversations.length === 0 && !searchQuery && !conversations.some(c => c.projectId)) ? (
          <div className="text-center py-12 px-4">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground font-medium">No conversations yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Start a new chat to begin</p>
          </div>
        ) : recentsConversations.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-muted-foreground">
              {searchQuery ? `No results for "${searchQuery}"` : "All chats are organized in projects"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedConversations.map(group => (
              <div key={group.key}>
                <div className="px-2 pb-1.5 pt-1">
                  <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                    {group.label}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.items.map((conv) => {
                    const convProject = conv.projectId
                      ? projects.find((p) => p.id === conv.projectId) ?? null
                      : null;
                    return (
                    <div
                      key={conv.id}
                      draggable
                      onDragStart={(e) => {
                        draggingConvIdRef.current = conv.id;
                        setDraggingConvId(conv.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/conversation-id", conv.id);
                      }}
                      onDragEnd={() => {
                        draggingConvIdRef.current = null;
                        setDraggingConvId(null);
                        setDragOverProjectId(null);
                      }}
                      className={`group relative flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all duration-200 animate-in fade-in slide-in-from-left ${
                        deletingId === conv.id
                          ? "opacity-50 scale-95"
                          : draggingConvId === conv.id
                          ? "opacity-40 scale-95 cursor-grabbing"
                          : conv.id === currentConversationId
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-md scale-[1.02]"
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground hover:scale-[1.01]"
                      }`}
                    >
                      {convProject && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                          style={{ backgroundColor: convProject.color }}
                          aria-hidden="true"
                        />
                      )}
                      <div
                        className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => onSelectConversation(conv.id)}
                      >
                        <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${
                          conv.id === currentConversationId 
                            ? "bg-primary/20" 
                            : "bg-muted/50"
                        }`}>
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 max-w-full">
                          {editingTitleId === conv.id ? (
                            <input
                              className="w-full bg-background border border-primary/30 rounded px-1.5 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                              value={editingTitle}
                              autoFocus
                              onChange={e => setEditingTitle(e.target.value)}
                              onBlur={() => {
                                if (editingTitle.trim()) onRenameConversation?.(conv.id, editingTitle.trim());
                                setEditingTitleId(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  if (editingTitle.trim()) onRenameConversation?.(conv.id, editingTitle.trim());
                                  setEditingTitleId(null);
                                }
                                if (e.key === 'Escape') setEditingTitleId(null);
                              }}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              className="block text-sm font-medium leading-snug break-words whitespace-normal line-clamp-2 cursor-text"
                              onDoubleClick={e => {
                                e.stopPropagation();
                                setEditingTitleId(conv.id);
                                setEditingTitle(conv.title);
                              }}
                              title="Double-click to rename"
                            >
                              {conv.pinned && (
                                <Pin className="inline-block w-3 h-3 mr-1 text-primary -mt-0.5 fill-primary/40" />
                              )}
                              {conv.title}
                            </span>
                          )}
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {formatRelativeTime(conv.updatedAt)}
                          </span>
                          {convProject && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onOpenProject(convProject.id); }}
                              className="inline-flex items-center gap-1.5 mt-1.5 max-w-full px-1.5 py-0.5 rounded-md bg-muted/40 hover:bg-muted/70 border border-border/40 hover:border-border/70 transition-colors group/pill"
                              title={`Open project: ${convProject.name}`}
                            >
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: convProject.color }}
                              />
                              <span className="text-[10px] font-semibold text-muted-foreground group-hover/pill:text-foreground truncate tracking-wide">
                                {convProject.name}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                      {onTogglePin && (
                        <button
                          className={`flex-shrink-0 p-2.5 rounded-xl border transition-all hover:scale-110 active:scale-95 self-start mt-0.5 ${
                            conv.pinned
                              ? "bg-primary/15 hover:bg-primary/25 border-primary/30 hover:border-primary/50 text-primary"
                              : "bg-muted/40 hover:bg-muted/70 border-border/40 hover:border-border text-muted-foreground"
                          }`}
                          onClick={(e) => { e.stopPropagation(); onTogglePin(conv.id); }}
                          title={conv.pinned ? "Unpin conversation" : "Pin conversation"}
                          aria-label={conv.pinned ? "Unpin conversation" : "Pin conversation"}
                        >
                          {conv.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        className={`flex-shrink-0 p-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 active:bg-destructive/30 border border-destructive/20 hover:border-destructive/40 transition-all hover:scale-110 active:scale-95 self-start mt-0.5 ${
                          deletingId === conv.id ? 'animate-pulse opacity-50' : 'opacity-100'
                        }`}
                        onClick={(e) => handleDeleteClick(conv, e)}
                        disabled={deletingId === conv.id}
                        title="Delete conversation"
                        aria-label={`Delete conversation: ${conv.title}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer — Claude-style user card with dropdown menu */}
      <div
        className="border-t border-sidebar-border bg-sidebar/50 backdrop-blur-sm flex flex-col justify-center safe-area-bottom"
        style={footerHeight ? { height: `${footerHeight}px` } : undefined}
      >
        <div className="p-3 relative" ref={userMenuRef}>
          {/* Dropdown menu — opens upward above the user card */}
          {isUserMenuOpen && (
            <div
              className="absolute bottom-full left-3 right-3 mb-2 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50"
              role="menu"
            >
              {/* User info header (read-only) */}
              {user && (
                <div className="px-3 py-3 border-b border-border bg-muted/30">
                  <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                </div>
              )}

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { setIsUserMenuOpen(false); onOpenProfile?.(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                  role="menuitem"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-foreground">My Profile</span>
                </button>

                <button
                  onClick={() => { setIsUserMenuOpen(false); onOpenSettings?.(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                  role="menuitem"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">Settings</span>
                </button>

                <button
                  onClick={() => { setIsUserMenuOpen(false); onOpenContact?.(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                  role="menuitem"
                >
                  <Headphones className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-foreground">Support</span>
                  {unreadReplies > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold tabular-nums">
                      {unreadReplies > 9 ? "9+" : unreadReplies}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setIsUserMenuOpen(false); onOpenAdminMessages?.(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                  role="menuitem"
                >
                  <Inbox className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-foreground">Inbox</span>
                  {unreadAdminMessages > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums">
                      {unreadAdminMessages > 9 ? "9+" : unreadAdminMessages}
                    </span>
                  )}
                </button>

                {onToggleTheme && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <button
                      onClick={() => { onToggleTheme(); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                      role="menuitem"
                    >
                      {theme === "dark" ? (
                        <Sun className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Moon className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-foreground">
                        {theme === "dark" ? "Light mode" : "Dark mode"}
                      </span>
                    </button>
                  </>
                )}

                {onSignOut && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <button
                      onClick={() => { setIsUserMenuOpen(false); onSignOut(); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-destructive/10 transition-colors text-left text-destructive"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* User card trigger */}
          {user ? (
            <button
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-200 group ${
                isUserMenuOpen ? "bg-sidebar-accent" : "hover:bg-sidebar-accent"
              }`}
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="bg-gradient-to-br from-primary to-primary/80 w-9 h-9 rounded-full flex items-center justify-center shadow-md ring-1 ring-primary/20">
                  <span className="text-sm font-black text-primary-foreground">
                    {getInitials(user.name)}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-sidebar" />
              </div>
              {/* Name + plan */}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                  Free plan
                </p>
              </div>
              {/* Chevron + badge */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {(unreadReplies + unreadAdminMessages) > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white leading-none">
                    {(unreadReplies + unreadAdminMessages) > 9 ? "9+" : (unreadReplies + unreadAdminMessages)}
                  </span>
                )}
                <ChevronUp
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                    isUserMenuOpen ? "" : "rotate-180"
                  }`}
                />
              </div>
            </button>
          ) : null}

          {/* Footer credit */}
          <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-muted-foreground/60">
            <span>Runner Code</span>
            <span>•</span>
            <span>v1.2.2</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        conversationTitle={conversationToDelete?.title || ""}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

    </div>
  );
}