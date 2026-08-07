import { ArrowUp, FileText, Image as ImageIcon, Loader2, Mic, Plus, Square, Upload, X } from "lucide-react";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

/** Format seconds to M:SS */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const MAX_CHARS = 10_000;
const CHAR_WARN_THRESHOLD = 0.8; // show counter when input > 80% of max
// When a single paste is longer than this, convert it to an attachment chip
// (mirrors Claude.ai behaviour for pasted long text).
const PASTE_TO_ATTACHMENT_THRESHOLD = 2_000;

interface PastedTextAttachment {
  id: string;
  content: string;
  chars: number;
  lines: number;
}

interface ChatInputProps {
  onSend: (message: string, images?: File[], pdf?: File) => void;
  disabled?: boolean;
  onToast?: (message: string, type?: "error" | "info") => void;
  /** Active conversation id used to scope draft auto-save. */
  conversationId?: string | null;
  /** Draft text restored from server when switching conversations. */
  initialDraft?: string;
  /** Called (debounced) whenever the draft text changes. */
  onDraftChange?: (text: string) => void;
  /** Optional slash command handlers. */
  onNewChat?: () => void;
  onClearChat?: () => void;
  onExport?: () => void;
  onOpenShortcuts?: () => void;
  /** Optional React node rendered inside the input pill (e.g. ModelSelector). */
  modelSelectorSlot?: React.ReactNode;
  /** When true, Send button transforms into a Stop button. */
  isStreaming?: boolean;
  /** Called when the user clicks the Stop button (only while streaming). */
  onStop?: () => void;
}

export function ChatInput({ onSend, disabled, onToast, conversationId, initialDraft, onDraftChange, onNewChat, onClearChat, onExport, onOpenShortcuts, modelSelectorSlot, isStreaming, onStop }: ChatInputProps) {
  const notify = (msg: string, type: "error" | "info" = "info") => {
    if (onToast) onToast(msg, type);
  };
  const [input, setInput] = useState(() => initialDraft ?? "");
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [pastedTexts, setPastedTexts] = useState<PastedTextAttachment[]>([]);
  const [previewPasted, setPreviewPasted] = useState<PastedTextAttachment | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");

  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOverLimit = input.length > MAX_CHARS;
  const showCharCounter = input.length > MAX_CHARS * CHAR_WARN_THRESHOLD;

  // Close attach menu on outside click / Escape
  useEffect(() => {
    if (!isAttachMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setIsAttachMenuOpen(false);
      }
    };
    const onEsc = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setIsAttachMenuOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isAttachMenuOpen]);

  // Restore draft when switching conversations
  useEffect(() => {
    setInput(initialDraft ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Notify parent of draft changes (debounced 400ms)
  useEffect(() => {
    const t = setTimeout(() => onDraftChange?.(input), 400);
    return () => clearTimeout(t);
  }, [input, conversationId]);

  // Lock body scroll and handle Escape while the pasted-text preview modal is open
  useEffect(() => {
    if (!previewPasted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setPreviewPasted(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [previewPasted]);

  // Timer that ticks every second while recording.
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingSeconds(0);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  // Window-level drag-and-drop: accept files dropped anywhere on the page.
  useEffect(() => {
    let dragDepth = 0;

    const hasFiles = (e: DragEvent) =>
      !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth++;
      setIsDraggingFile(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setIsDraggingFile(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth = 0;
      setIsDraggingFile(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) processFiles(files);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImages.length]);

  const handleSend = () => {
    if (isOverLimit) {
      notify(`Message is too long (max ${MAX_CHARS.toLocaleString()} characters).`, "error");
      return;
    }
    const hasContent =
      input.trim() || selectedImages.length > 0 || selectedPdf || pastedTexts.length > 0;
    if (hasContent && !disabled) {
      // Merge pasted long-text attachments into the outgoing message.
      // Each is wrapped with clear delimiters so the AI knows it's pasted content.
      let outgoing = input.trim();
      if (pastedTexts.length > 0) {
        const blocks = pastedTexts
          .map((p, idx) => {
            const label = pastedTexts.length > 1 ? `Pasted text ${idx + 1}` : "Pasted text";
            return `--- ${label} (${p.chars.toLocaleString()} characters) ---\n${p.content}\n--- End of ${label.toLowerCase()} ---`;
          })
          .join("\n\n");
        outgoing = outgoing ? `${blocks}\n\n${outgoing}` : blocks;
      }
      onSend(
        outgoing,
        selectedImages.length > 0 ? selectedImages : undefined,
        selectedPdf || undefined
      );
      setInput("");
      setSelectedImages([]);
      setImagePreviews([]);
      setSelectedPdf(null);
      setPastedTexts([]);
      onDraftChange?.("");
    }
  };

  // ── Slash commands ───────────────────────────────────────────────
  const SLASH_COMMANDS: Array<{
    name: string;
    description: string;
    enabled: boolean;
    run: () => void;
  }> = [
    {
      name: "/new",
      description: "Start a new chat",
      enabled: !!onNewChat,
      run: () => onNewChat?.(),
    },
    {
      name: "/clear",
      description: "Clear messages in this chat",
      enabled: !!onClearChat,
      run: () => onClearChat?.(),
    },
    {
      name: "/export",
      description: "Export current chat as Markdown",
      enabled: !!onExport,
      run: () => onExport?.(),
    },
    {
      name: "/help",
      description: "Show keyboard shortcuts",
      enabled: !!onOpenShortcuts,
      run: () => onOpenShortcuts?.(),
    },
  ];

  const trimmedForSlash = input.trimStart();
  const isSlashMode =
    trimmedForSlash.startsWith("/") && !trimmedForSlash.includes("\n") && trimmedForSlash.length <= 32;
  const slashQuery = isSlashMode ? trimmedForSlash.toLowerCase() : "";
  const filteredCommands = isSlashMode
    ? SLASH_COMMANDS.filter((c) => c.enabled && c.name.startsWith(slashQuery))
    : [];
  const showSlashPalette = isSlashMode && filteredCommands.length > 0;

  // Reset selection when the filtered set changes
  useEffect(() => {
    setSlashIndex(0);
  }, [slashQuery, filteredCommands.length]);

  const runSlashCommand = (cmd: { run: () => void } | undefined) => {
    if (!cmd) return;
    cmd.run();
    setInput("");
    onDraftChange?.("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashPalette && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % filteredCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        runSlashCommand(filteredCommands[slashIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setInput("");
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        runSlashCommand(filteredCommands[slashIndex]);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Ctrl+Enter also sends (alternative shortcut)
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFiles = (files: FileList | File[]) => {
    if (!files || (files as FileList).length === 0) return;
    const imageFiles: File[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        if (selectedImages.length + imageFiles.length >= 6) {
          notify("Maximum 6 images allowed.", "error");
          return;
        }
        imageFiles.push(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      } else if (file.type === "application/pdf") {
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          notify("PDF is too large. Max size is 10MB.", "error");
          return;
        }
        setSelectedPdf(file);
      } else {
        notify("Please select a valid image or PDF file.", "error");
      }
    });

    if (imageFiles.length > 0) {
      setSelectedImages((prev) => [...prev, ...imageFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check if clipboard contains image or PDF
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault(); // Prevent pasting image as text
        
        // Limit to 6 images max
        if (selectedImages.length >= 6) {
          notify("Maximum 6 images allowed.", "error");
          return;
        }
        
        const file = item.getAsFile();
        if (file) {
          setSelectedImages(prev => [...prev, file]);
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreviews(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        }
        return;
      } else if (item.type === "application/pdf") {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (file) {
          setSelectedPdf(file);
        }
        return;
      }
    }

    // Long-text paste → convert to attachment chip (Claude-style)
    const pastedText = e.clipboardData?.getData("text");
    if (pastedText && pastedText.length > PASTE_TO_ATTACHMENT_THRESHOLD) {
      e.preventDefault();
      const attachment: PastedTextAttachment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        content: pastedText,
        chars: pastedText.length,
        lines: pastedText.split(/\r\n|\r|\n/).length,
      };
      setPastedTexts((prev) => [...prev, attachment]);
    }
  };

  const removePastedText = (id: string) => {
    setPastedTexts((prev) => prev.filter((p) => p.id !== id));
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePdf = () => {
    setSelectedPdf(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      
      // Check if browser supports Web Speech API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        notify("Voice recognition requires Chrome or Edge.", "error");
        return;
      }
      
      // Initialize speech recognition with professional settings
      const recognition = new SpeechRecognition();
      
      // Auto-detect language: use the browser/device locale so ANY language is supported.
      // If the user already typed Arabic text, prefer Arabic; otherwise use the device language.
      const hasArabic = /[\u0600-\u06FF]/.test(input);
      recognition.lang = hasArabic ? "ar" : (navigator.language || "en-US");
      recognition.continuous = true; // Keep listening until manually stopped
      recognition.interimResults = true; // Show real-time results
      recognition.maxAlternatives = 1; // Best result only
      
      // Clear transcript at start
      transcriptRef.current = "";
      
      recognition.onstart = () => {
        setIsRecording(true);
        setIsTranscribing(true);
      };
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            // Final result - add to permanent transcript
            finalTranscript += transcript;
          } else {
            // Interim result - show temporarily
            interimTranscript += transcript;
          }
        }
        
        // Update transcript reference with final results only
        if (finalTranscript) {
          transcriptRef.current += (transcriptRef.current ? ' ' : '') + finalTranscript;
        }
        
        // Update input field with final + interim (for real-time feedback)
        const fullText = transcriptRef.current + (interimTranscript ? ' ' + interimTranscript : '');
        setInput(fullText.trim());
      };
      
      recognition.onerror = (event: any) => {
        
        if (event.error === 'not-allowed') {
          notify("Microphone access denied. Please enable it in browser settings.", "error");
          setIsRecording(false);
          setIsTranscribing(false);
        } else if (event.error === 'no-speech') {
          // Don't stop, just continue
        } else if (event.error !== 'aborted') {
        }
      };
      
      recognition.onend = () => {
        setIsRecording(false);
        setIsTranscribing(false);
        
        // Keep the final transcript in the input
        if (transcriptRef.current) {
          setInput(transcriptRef.current.trim());
        }
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error) {
      notify("Unable to access microphone. Check browser permissions.", "error");
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    
    setIsRecording(false);
    setIsTranscribing(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="border-t border-border/50 bg-background/95 backdrop-blur-md p-2.5 sm:p-3 md:p-4 lg:p-6 shadow-lg safe-area-bottom">
      {isDraggingFile &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-primary/10 backdrop-blur-sm pointer-events-none animate-in fade-in duration-150">
            <div className="m-4 sm:m-8 w-full h-full max-w-5xl border-4 border-dashed border-primary/70 rounded-2xl flex flex-col items-center justify-center gap-4 bg-background/80 shadow-2xl">
              <div className="p-5 rounded-full bg-primary/15 border border-primary/30">
                <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
              </div>
              <div className="text-center px-6">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">Drop files to attach</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Images (up to 6) or a PDF (max 10 MB)</p>
              </div>
            </div>
          </div>,
          document.body
        )}
      <div className="max-w-4xl mx-auto">
        <div className="mb-3 flex flex-wrap gap-3">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative inline-block group/preview animate-in fade-in slide-in-from-bottom-2">
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-xl overflow-hidden border-2 border-primary/40 hover:border-primary shadow-lg transition-all duration-200 hover:shadow-[0_0_16px_2px_rgba(227,30,36,0.2)]">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover/preview:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity" />
              </div>
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-white rounded-full p-1.5 shadow-lg transition-all hover:scale-110 ring-2 ring-background"
                aria-label={`Remove image ${index + 1}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {imagePreviews.length > 1 && (
                <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                  {index + 1}/{imagePreviews.length}
                </div>
              )}
            </div>
          ))}
          {selectedPdf && (
            <div className="relative inline-block group/preview animate-in fade-in slide-in-from-bottom-2">
              <div className="h-20 w-32 sm:h-24 sm:w-40 bg-gradient-to-br from-red-500/10 to-red-600/20 rounded-xl border-2 border-red-500 shadow-lg flex flex-col items-center justify-center p-3 transition-all hover:shadow-[0_0_16px_2px_rgba(239,68,68,0.2)]">
                <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 mb-1" />
                <span className="text-[10px] sm:text-xs font-medium text-red-500 truncate max-w-full px-1">
                  {selectedPdf.name}
                </span>
                <span className="text-[9px] text-red-500/70">
                  {(selectedPdf.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                onClick={removePdf}
                className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-white rounded-full p-1.5 shadow-lg transition-all hover:scale-110 ring-2 ring-background"
                aria-label="Remove PDF"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {pastedTexts.map((p) => {
            const previewLine =
              p.content
                .split(/\r\n|\r|\n/)
                .find((l) => l.trim().length > 0)
                ?.slice(0, 60) || p.content.slice(0, 60);
            return (
              <div
                key={p.id}
                className="relative inline-block group/preview animate-in fade-in slide-in-from-bottom-2"
              >
                <button
                  type="button"
                  onClick={() => setPreviewPasted(p)}
                  className="h-24 w-44 sm:h-24 sm:w-52 bg-card/80 hover:bg-card active:bg-card backdrop-blur-sm rounded-xl border-2 border-border/60 hover:border-primary/50 shadow-sm hover:shadow-md flex flex-col items-start justify-between p-3 transition-all text-left overflow-hidden cursor-pointer touch-manipulation"
                  title="Tap to view full text"
                  aria-label="View pasted text"
                >
                  <div className="text-[11px] sm:text-[11px] text-muted-foreground/80 leading-snug overflow-hidden line-clamp-3 font-mono w-full break-all">
                    {previewLine}
                  </div>
                  <div className="flex items-center justify-between w-full mt-1.5 gap-2">
                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-md border border-primary/20">
                      <FileText className="w-2.5 h-2.5" />
                      Pasted
                    </span>
                    <span className="text-[10px] sm:text-[10px] text-muted-foreground/70 tabular-nums truncate">
                      {p.lines > 1 ? `${p.lines.toLocaleString()} lines` : `${p.chars.toLocaleString()} chars`}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => removePastedText(p.id)}
                  className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-white rounded-full p-1.5 shadow-lg transition-all hover:scale-110 ring-2 ring-background"
                  aria-label="Remove pasted text"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        {/* ── Unified Claude-style input container ─────────────── */}
        <div className="relative">
          {/* Slash command palette */}
          {showSlashPalette && (
            <div className="absolute bottom-full left-0 right-0 mb-2 z-40 bg-popover border border-border/60 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 bg-muted/40">
                Commands
              </div>
              <div className="max-h-64 overflow-auto py-1">
                {filteredCommands.map((cmd, idx) => (
                  <button
                    key={cmd.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      runSlashCommand(cmd);
                    }}
                    onMouseEnter={() => setSlashIndex(idx)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                      idx === slashIndex ? "bg-primary/10 text-foreground" : "hover:bg-muted/50 text-foreground/90"
                    }`}
                  >
                    <span className="font-mono text-xs sm:text-sm font-semibold text-primary">{cmd.name}</span>
                    <span className="text-[11px] sm:text-xs text-muted-foreground truncate">{cmd.description}</span>
                  </button>
                ))}
              </div>
              <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/40 bg-muted/30">
                <span className="font-mono">Tab</span> or <span className="font-mono">Enter</span> to run · <span className="font-mono">Esc</span> to cancel
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />

          {/* The unified pill — textarea on top, actions row at the bottom */}
          <div
            className={`relative bg-input-background/60 backdrop-blur-md border ${
              isOverLimit
                ? "border-destructive/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus-within:border-destructive focus-within:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]"
                : "border-border/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-border focus-within:border-primary/50 focus-within:shadow-[0_0_0_4px_rgba(227,30,36,0.08)]"
            } rounded-3xl transition-all duration-200`}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={isRecording ? "" : "Ask anything…"}
              className="min-h-[56px] sm:min-h-[60px] max-h-[200px] !border-0 !bg-transparent !shadow-none focus-visible:!ring-0 focus-visible:!ring-offset-0 focus:!shadow-none rounded-none resize-none text-sm sm:text-base leading-relaxed px-4 sm:px-5 pt-4 pb-1 placeholder:text-muted-foreground/60 touch-manipulation"
              disabled={disabled}
            />

            {/* Recording overlay — covers textarea when empty */}
            {isRecording && !input && (
              <div className="absolute top-0 left-0 right-0 h-[56px] sm:h-[60px] flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-1.5">
                  {[0.4, 0.7, 1, 0.7, 0.4].map((scale, i) => (
                    <span
                      key={i}
                      className="w-0.5 bg-destructive rounded-full animate-bounce"
                      style={{
                        height: `${16 * scale}px`,
                        animationDelay: `${i * 80}ms`,
                        animationDuration: "700ms",
                      }}
                    />
                  ))}
                  <span className="ml-2 text-xs text-destructive font-medium">
                    {/^ar\b/i.test(navigator.language || "") ? "يستمع..." : "Listening…"}
                  </span>
                </div>
              </div>
            )}

            {/* Bottom action row — ghost icons on the left, mic + send on the right */}
            <div className="flex items-center gap-1 px-2 pb-2 pt-1">
              {/* Plus button + attach menu */}
              <div className="relative" ref={attachMenuRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 shrink-0 rounded-full transition-colors touch-manipulation ${
                    isAttachMenuOpen
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                  onClick={() => setIsAttachMenuOpen(prev => !prev)}
                  disabled={disabled}
                  aria-label="Add attachment"
                  aria-haspopup="menu"
                  aria-expanded={isAttachMenuOpen}
                  title="Add attachment"
                >
                  <Plus className={`w-[18px] h-[18px] transition-transform duration-200 ${isAttachMenuOpen ? "rotate-45" : ""}`} />
                </Button>
                {isAttachMenuOpen && (
                  <div
                    className="absolute bottom-full left-0 mb-2 min-w-[220px] bg-popover border border-border/60 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                    role="menu"
                  >
                    <button
                      type="button"
                      onClick={() => { setIsAttachMenuOpen(false); imageInputRef.current?.click(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                      role="menuitem"
                    >
                      <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground">Upload photos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAttachMenuOpen(false); fileInputRef.current?.click(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                      role="menuitem"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground">Upload file (PDF)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Hidden image input (Upload photos) */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />

              <div className="flex-1" />

              {modelSelectorSlot}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleRecording}
                disabled={disabled}
                title={isRecording ? "Stop recording" : "Voice input"}
                aria-label={isRecording ? "Stop recording" : "Start voice input"}
                className={`h-9 w-9 shrink-0 rounded-full transition-colors touch-manipulation ${
                  isRecording
                    ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                }`}
              >
                {isRecording ? (
                  <span className="relative flex items-center justify-center">
                    <span className="absolute w-6 h-6 rounded-full bg-destructive/25 animate-ping" />
                    <Mic className="w-[18px] h-[18px] relative z-10" />
                  </span>
                ) : isTranscribing ? (
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                ) : (
                  <Mic className="w-[18px] h-[18px]" />
                )}
              </Button>

              {/* Send / Stop button — toggles based on streaming state (Claude-style) */}
              {isStreaming ? (
                <Button
                  type="button"
                  onClick={onStop}
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/80 transition-all duration-200 active:scale-95 shadow-sm touch-manipulation"
                  aria-label="Stop generating"
                  title="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={disabled || isOverLimit || (!input.trim() && selectedImages.length === 0 && !selectedPdf && pastedTexts.length === 0)}
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full transition-all duration-200 active:scale-95 touch-manipulation bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-sm hover:shadow-[0_0_14px_2px_rgba(227,30,36,0.30)] disabled:bg-muted disabled:text-muted-foreground/60 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:shadow-none disabled:shadow-none"
                  aria-label="Send message"
                >
                  {disabled ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUp className="w-[18px] h-[18px] stroke-[2.5]" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Helper text — Claude-style disclaimer */}
          <p className="text-center text-[11px] text-muted-foreground/70 mt-2 px-2">
            Runner Code can make mistakes. Verify important info.
          </p>
        </div>
        {(showCharCounter || isRecording) && (
          <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] md:text-xs text-muted-foreground/60 text-center flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap px-1">
            {showCharCounter && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold tabular-nums ${
                  isOverLimit
                    ? "bg-destructive/15 text-destructive"
                    : input.length > MAX_CHARS * 0.95
                    ? "bg-yellow-500/15 text-yellow-600"
                    : "bg-muted/40 text-muted-foreground"
                }`}
                aria-live="polite"
              >
                {input.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            )}

            {isRecording && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-full font-medium text-[10px] sm:text-xs">
                <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-ping" />
                <span className="tabular-nums font-bold">{formatDuration(recordingSeconds)}</span>
                <span className="opacity-70">·</span>
                {/[\u0600-\u06FF]/.test(input) ? "انقر للإيقاف" : "Tap mic to stop"}
              </span>
            )}
          </div>
        )}
      </div>
      {previewPasted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPasted(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Pasted text preview"
        >
          <div
            className="relative w-full sm:max-w-3xl h-[92dvh] sm:h-auto sm:max-h-[80vh] bg-card border border-border/60 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border/60" />
            </div>
            <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-border/50 bg-muted/30 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20 flex-shrink-0">
                  <FileText className="w-3 h-3" />
                  Pasted
                </span>
                <span className="text-[11px] sm:text-sm text-muted-foreground tabular-nums truncate">
                  {previewPasted.chars.toLocaleString()} chars · {previewPasted.lines.toLocaleString()} lines
                </span>
              </div>
              <button
                onClick={() => setPreviewPasted(null)}
                className="rounded-lg p-2 -mr-1 hover:bg-muted active:bg-muted text-muted-foreground hover:text-foreground transition-colors touch-manipulation flex-shrink-0"
                aria-label="Close preview"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </div>
            <pre className="flex-1 overflow-auto overscroll-contain px-3 sm:px-5 py-3 sm:py-4 text-[11px] sm:text-sm font-mono leading-relaxed whitespace-pre-wrap break-words text-foreground/90 safe-area-bottom">
              {previewPasted.content}
            </pre>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
