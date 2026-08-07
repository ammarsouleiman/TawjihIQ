import { Keyboard, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  items: Shortcut[];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: "General",
    items: [
      { keys: ["?"], description: "Open this shortcuts panel" },
      { keys: ["Esc"], description: "Close any open dialog" },
    ],
  },
  {
    title: "Conversations",
    items: [
      { keys: ["Ctrl", "K"], description: "Start a new chat" },
      { keys: ["Ctrl", "Shift", "E"], description: "Export current chat as Markdown" },
    ],
  },
  {
    title: "Message input",
    items: [
      { keys: ["Enter"], description: "Send message" },
      { keys: ["Shift", "Enter"], description: "New line" },
      { keys: ["Ctrl", "Enter"], description: "Send (alternative)" },
      { keys: ["/"], description: "Open slash commands" },
    ],
  },
  {
    title: "Attachments",
    items: [
      { keys: ["Paste"], description: "Paste image, PDF, or long text" },
      { keys: ["Drag & drop"], description: "Drop files anywhere on the page" },
    ],
  },
];

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-[11px] font-bold font-mono bg-muted/80 border border-border/60 rounded-md shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] text-foreground/90">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="relative w-full sm:max-w-2xl h-[92dvh] sm:h-auto sm:max-h-[85vh] bg-card border border-border/60 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border/50 bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
              <Keyboard className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-foreground truncate">Keyboard shortcuts</h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Work faster across the app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted active:bg-muted text-muted-foreground hover:text-foreground transition-colors touch-manipulation flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto overscroll-contain px-4 sm:px-5 py-4 space-y-5 safe-area-bottom">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-xs sm:text-sm text-foreground/90">{s.description}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {s.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <Key>{k}</Key>
                          {i < s.keys.length - 1 && (
                            <span className="text-muted-foreground/60 text-[10px]">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
