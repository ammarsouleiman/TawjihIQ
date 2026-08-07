import {
    ArrowLeft,
    FolderOpen,
    MessageSquare,
    Plus,
    Save,
    Sparkles,
    Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Conversation, Project } from "../types/chat";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface ProjectViewProps {
  project: Project;
  conversations: Conversation[];
  onBack: () => void;
  onUpdateProject: (
    id: string,
    patch: { name?: string; color?: string; instructions?: string },
  ) => void | Promise<void>;
  onDeleteProject: (id: string) => void | Promise<void>;
  onNewChatInProject: (projectId: string) => void;
  onOpenConversation: (id: string) => void;
  onRemoveConversationFromProject: (convId: string) => void;
}

// Preset palette — matches Claude's tidy color picker.
const COLOR_PRESETS = [
  "#e31e24", // brand red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#64748b", // slate
];

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return new Date(ts).toLocaleDateString("en-US", { weekday: "short" });
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ProjectView({
  project,
  conversations,
  onBack,
  onUpdateProject,
  onDeleteProject,
  onNewChatInProject,
  onOpenConversation,
  onRemoveConversationFromProject,
}: ProjectViewProps) {
  const projectConvs = useMemo(
    () => conversations.filter((c) => c.projectId === project.id).sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations, project.id],
  );

  // Local editable state for name + instructions. Synced back to parent on
  // blur / explicit save so we don't fire a network request on every keystroke.
  const [name, setName] = useState(project.name);
  const [instructions, setInstructions] = useState(project.instructions);
  const [color, setColor] = useState(project.color);
  const [isDirtyInstructions, setIsDirtyInstructions] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset local state when the user navigates to a different project.
  useEffect(() => {
    setName(project.name);
    setInstructions(project.instructions);
    setColor(project.color);
    setIsDirtyInstructions(false);
    setConfirmDelete(false);
  }, [project.id]);

  // Keep local color in sync with optimistic parent updates triggered by the picker.
  useEffect(() => { setColor(project.color); }, [project.color]);

  useEffect(() => {
    if (!colorMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setColorMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setColorMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [colorMenuOpen]);

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === project.name) {
      setName(project.name); // revert if empty
      return;
    }
    onUpdateProject(project.id, { name: trimmed });
  };

  const commitInstructions = () => {
    if (!isDirtyInstructions) return;
    onUpdateProject(project.id, { instructions });
    setIsDirtyInstructions(false);
  };

  const pickColor = (c: string) => {
    setColor(c);
    setColorMenuOpen(false);
    onUpdateProject(project.id, { color: c });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto-cancel after 4s so the destructive-state doesn't stick forever.
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    onDeleteProject(project.id);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Top action bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleDelete}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
            confirmDelete
              ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "border-destructive/30 text-destructive hover:bg-destructive/10"
          }`}
          aria-label={confirmDelete ? "Confirm delete project" : "Delete project"}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {confirmDelete ? "Click again to confirm" : "Delete project"}
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
          {/* Header: color dot + editable name */}
          <div className="flex items-start gap-4">
            <div className="relative" ref={colorMenuRef}>
              <button
                onClick={() => setColorMenuOpen((v) => !v)}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-border/30 hover:ring-border transition-all"
                style={{ backgroundColor: color }}
                aria-label="Change project color"
                title="Change color"
              >
                <FolderOpen className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow" />
              </button>
              {colorMenuOpen && (
                <div className="absolute top-full left-0 mt-2 bg-popover border border-border rounded-xl shadow-2xl p-3 grid grid-cols-3 gap-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => pickColor(c)}
                      className={`w-8 h-8 rounded-lg ring-2 transition-transform hover:scale-110 ${
                        c === color ? "ring-foreground" : "ring-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Use color ${c}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") { setName(project.name); (e.target as HTMLInputElement).blur(); }
                }}
                className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-foreground border-b-2 border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors px-1 py-1"
                placeholder="Project name"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1.5 px-1">
                Created {new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {" · "}
                {projectConvs.length} {projectConvs.length === 1 ? "conversation" : "conversations"}
              </p>
            </div>
            <Button
              onClick={() => onNewChatInProject(project.id)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md flex-shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New chat
            </Button>
          </div>

          {/* Instructions editor */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Project instructions</h2>
              </div>
              {isDirtyInstructions && (
                <button
                  onClick={commitInstructions}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save changes
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              These instructions are added to the AI's system prompt for every chat in this project.
              Use them to set context, tone, formatting rules, or domain knowledge.
            </p>
            <textarea
              value={instructions}
              onChange={(e) => { setInstructions(e.target.value); setIsDirtyInstructions(true); }}
              onBlur={commitInstructions}
              placeholder="Example: You are reviewing a Next.js + TypeScript codebase. Always suggest tests for new code. Reply in Arabic when the user writes in Arabic, English otherwise."
              className="w-full min-h-[180px] sm:min-h-[220px] bg-card border border-border rounded-xl p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all resize-y font-mono"
              maxLength={20000}
            />
            <p className="text-[10px] text-muted-foreground/70 text-right">
              {instructions.length} / 20000
            </p>
          </section>

          {/* Conversations in project */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Conversations in this project</h2>
            </div>
            {projectConvs.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl py-10 px-6 text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground font-medium">No conversations yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                  Start a new chat — it will automatically use this project's instructions.
                </p>
                <Button
                  onClick={() => onNewChatInProject(project.id)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Start first chat
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {projectConvs.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => onOpenConversation(conv.id)}
                    className="group flex items-center gap-3 p-3 bg-card hover:bg-muted/40 border border-border/60 hover:border-border rounded-xl transition-all duration-200 cursor-pointer hover:shadow-sm"
                  >
                    <div className="p-2 rounded-lg bg-muted/60 group-hover:bg-primary/10 flex-shrink-0 transition-colors">
                      <MessageSquare className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate leading-tight">{conv.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatRelative(conv.updatedAt)} · {conv.messages.length} {conv.messages.length === 1 ? "message" : "messages"}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveConversationFromProject(conv.id); }}
                      className="opacity-0 group-hover:opacity-100 text-[11px] font-medium text-muted-foreground hover:text-destructive px-2.5 py-1 rounded-md hover:bg-destructive/10 transition-all"
                      title="Remove from project (chat is preserved in Recents)"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
