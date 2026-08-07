import { FolderPlus, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

interface NewProjectModalProps {
  isOpen: boolean;
  onCreate: (name: string, color: string) => void;
  onCancel: () => void;
}

const COLOR_PRESETS = [
  "#e31e24", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#64748b",
];

export function NewProjectModal({ isOpen, onCreate, onCancel }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setColor(COLOR_PRESETS[0]);
      // Defer focus until after the open animation begins so it doesn't fight the mount.
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const trimmed = name.trim();
  const canCreate = trimmed.length > 0 && trimmed.length <= 100;

  const submit = () => {
    if (!canCreate) return;
    onCreate(trimmed, color);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <div
          className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border/60">
            <button
              onClick={onCancel}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3 pr-8">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 transition-colors"
                style={{ backgroundColor: color }}
              >
                <FolderPlus className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">New project</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Group related chats and give the AI shared instructions.
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 sm:px-6 py-5 space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="project-name" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Project name
              </label>
              <input
                id="project-name"
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="e.g. Marketing site, Thesis research, Mobile app v2"
                maxLength={100}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
              />
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground/70 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary/70" />
                  You can rename anytime
                </span>
                <span className={`tabular-nums ${trimmed.length > 80 ? "text-amber-500" : "text-muted-foreground/60"}`}>
                  {trimmed.length} / 100
                </span>
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-9 h-9 rounded-lg ring-2 transition-all hover:scale-110 active:scale-95 ${
                      c === color ? "ring-foreground shadow-md" : "ring-transparent hover:ring-border"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Use color ${c}`}
                    aria-pressed={c === color}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 flex gap-2 sm:gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 h-10 sm:h-11 text-sm font-semibold rounded-xl hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!canCreate}
              className="flex-1 h-10 sm:h-11 text-sm font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Create project
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
