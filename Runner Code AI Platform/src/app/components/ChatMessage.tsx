import { ArrowRight, Check, Copy, ExternalLink, FileText, Pencil, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import logo from "../../assets/3546325734eebbae935ba64a28db9c350a382fdd.png";
import { useAuth } from "../context/AuthContext";
import { ChatMessage as ChatMessageType } from "../types/chat";
import { Artifact } from "./ArtifactsPanel";
import { Button } from "./ui/button";

const ARTIFACT_LANGS = new Set(["html", "svg", "jsx", "tsx"]);

interface ChatMessageProps {
  message: ChatMessageType;
  onEdit?: (id: string, newContent: string) => void;
  onToast?: (message: string, type?: "error" | "info") => void;
  isLastMessage?: boolean;
  onSuggestionClick?: (content: string) => void;
  onOpenArtifact?: (artifact: Artifact) => void;
  savedReaction?: "up" | "down" | null;
  onReaction?: (messageId: string, reaction: "up" | "down" | null) => void;
}

export function ChatMessage({ message, onEdit, onToast: _onToast, isLastMessage, onSuggestionClick, onOpenArtifact, savedReaction, onReaction }: ChatMessageProps) {
  const isUser = message.role === "user";
  const { user: authUser } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);

  // Sync persisted reaction from server/parent
  useEffect(() => {
    setReaction(savedReaction ?? null);
  }, [savedReaction]);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [previewPasted, setPreviewPasted] = useState<{ content: string; chars: number; lines: number } | null>(null);

  // Lock body scroll and handle Escape while the pasted-text preview modal is open
  useEffect(() => {
    if (!previewPasted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewPasted(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [previewPasted]);

  // Get initials from user name
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const copyMessageContent = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = message.content;
      ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        setCopiedMessage(true);
        setTimeout(() => setCopiedMessage(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  // Parse the message content for pasted-text attachment blocks (created by ChatInput)
  // and split them out of the regular markdown so they render as Claude-style chips.
  const PASTED_BLOCK_RE =
    /--- Pasted text(?:\s+\d+)? \(([\d,]+) characters\) ---\n([\s\S]*?)\n--- End of pasted text(?:\s+\d+)? ---/g;
  type PastedBlock = { id: string; content: string; chars: number; lines: number };
  const pastedBlocks: PastedBlock[] = [];
  let strippedContent = message.content;
  if (isUser && message.content.includes("--- Pasted text")) {
    strippedContent = message.content.replace(PASTED_BLOCK_RE, (_m, _chars, body) => {
      const content = body as string;
      pastedBlocks.push({
        id: `${message.id}-p${pastedBlocks.length}`,
        content,
        chars: content.length,
        lines: content.split(/\r\n|\r|\n/).length,
      });
      return ""; // remove from rendered text
    });
    // Collapse extra blank lines left behind
    strippedContent = strippedContent.replace(/\n{3,}/g, "\n\n").trim();
  }

  return (
    <div
      className={`group flex gap-2 sm:gap-3 md:gap-4 p-2.5 sm:p-3 md:p-4 lg:p-6 animate-in slide-in-from-bottom-2 fade-in duration-300 ${
        isUser
          ? "bg-muted/[0.06] border-b border-border/20"
          : "bg-card/50 border-b border-border/15"
      }`}
    >
      <div className="flex-shrink-0">
        <div
          className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg ${
            isUser 
              ? "bg-gradient-to-br from-muted to-muted/80" 
              : "bg-gradient-to-br from-primary to-primary/80 ring-2 ring-primary/20"
          }`}
        >
          {isUser ? (
            authUser ? (
              <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-primary/30">
                <span className="text-[10px] sm:text-xs md:text-sm font-black text-primary-foreground drop-shadow-md">
                  {getInitials(authUser.name)}
                </span>
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center">
                <span className="text-[10px] sm:text-xs md:text-sm font-black text-foreground">U</span>
              </div>
            )
          ) : (
            <img 
              src={logo} 
              alt="Runner Code AI" 
              className="w-full h-full object-cover rounded-lg sm:rounded-xl md:rounded-2xl" 
            />
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-1 sm:mb-1.5 flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-muted-foreground">
              {isUser ? "You" : "Runner Code AI"}
            </span>
            <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground/60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
              {new Date(message.timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          
          {/* Edit button for user text-only messages */}
          {isUser && onEdit && !message.imageUrl && !message.imageUrls && !message.pdfUrl && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIsEditing(true); setEditValue(message.content); }}
              className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary transition-all sm:opacity-0 sm:group-hover:opacity-100"
              title="Edit message"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {/* Copy button for AI messages — reveals on hover */}
          {!isUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyMessageContent}
              className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100"
              title="Copy message"
            >
              {copiedMessage ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>
        
        {/* Display images if present (supports multiple images) */}
        {(message.imageUrls && message.imageUrls.length > 0) && (
          <div className="mb-2 sm:mb-3 md:mb-4">
            <div className={`grid gap-2 ${
              message.imageUrls.length === 1 ? 'grid-cols-1' : 
              message.imageUrls.length === 2 ? 'grid-cols-2' : 
              message.imageUrls.length <= 4 ? 'grid-cols-2 sm:grid-cols-2' : 
              'grid-cols-2 sm:grid-cols-3'
            }`}>
              {message.imageUrls.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Uploaded image ${index + 1}`}
                    className="w-full max-w-full sm:max-w-xs lg:max-w-sm rounded-lg sm:rounded-xl border-2 border-primary/20 shadow-lg cursor-pointer touch-manipulation object-cover aspect-square"
                    onClick={() => window.open(imageUrl, '_blank')}
                    loading="lazy"
                  />
                  {message.imageUrls!.length > 1 && (
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                      {index + 1}/{message.imageUrls!.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Legacy single image support */}
        {message.imageUrl && !message.imageUrls && (
          <div className="mb-2 sm:mb-3 md:mb-4">
            <img
              src={message.imageUrl}
              alt="Uploaded image"
              className="max-w-full sm:max-w-md lg:max-w-lg rounded-lg sm:rounded-xl border-2 border-primary/20 shadow-lg cursor-pointer touch-manipulation"
              onClick={() => window.open(message.imageUrl, '_blank')}
              loading="lazy"
            />
          </div>
        )}
        
        {/* Display PDF if present */}
        {message.pdfUrl && (
          <div className="mb-2 sm:mb-3 md:mb-4">
            <a
              href={message.pdfUrl}
              download
              className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-br from-red-500/10 to-red-600/20 hover:from-red-500/20 hover:to-red-600/30 border-2 border-red-500 rounded-lg sm:rounded-xl shadow-lg transition-all hover:scale-105 cursor-pointer touch-manipulation group"
            >
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col items-start">
                <span className="text-xs sm:text-sm font-semibold text-red-500">
                  PDF Document Attached
                </span>
                <span className="text-[10px] sm:text-xs text-red-500/70">
                  Click to download
                </span>
              </div>
            </a>
          </div>
        )}
        
        <div className="prose prose-xs sm:prose-sm md:prose-base dark:prose-invert prose-pre:p-0 prose-pre:bg-transparent max-w-none">
          {isUser && pastedBlocks.length > 0 && !isEditing && (
            <div className="not-prose mb-2 sm:mb-3 flex flex-wrap gap-2">
              {pastedBlocks.map((p) => {
                const previewLine =
                  p.content.split(/\r\n|\r|\n/).find((l) => l.trim().length > 0)?.slice(0, 120) ||
                  p.content.slice(0, 120);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreviewPasted({ content: p.content, chars: p.chars, lines: p.lines })}
                    className="group/chip flex flex-col items-start justify-between h-24 w-full sm:h-24 sm:w-52 max-w-full bg-card/80 hover:bg-card active:bg-card backdrop-blur-sm rounded-xl border-2 border-border/60 hover:border-primary/50 shadow-sm hover:shadow-md p-3 transition-all text-left overflow-hidden cursor-pointer touch-manipulation"
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
                );
              })}
            </div>
          )}
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="w-full bg-background border border-primary/30 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                rows={Math.max(2, editValue.split('\n').length)}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (editValue.trim()) { onEdit?.(message.id, editValue.trim()); setIsEditing(false); }
                  }
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { if (editValue.trim()) { onEdit?.(message.id, editValue.trim()); setIsEditing(false); } }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Save & Resend
                </button>
              </div>
            </div>
          ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                const codeString = String(children).replace(/\n$/, "");
                
                return !inline && match ? (
                  <div className="relative group my-3 sm:my-4 rounded-xl overflow-hidden shadow-lg border border-border/50">
                    <div className="flex items-center justify-between bg-gradient-to-r from-[#1e1e1e] to-[#252525] px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-700/50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-destructive/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                        <span className="text-xs sm:text-sm font-mono text-gray-400 ml-2">{match[1]}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Preview button for previewable languages */}
                        {ARTIFACT_LANGS.has(match[1].toLowerCase()) && onOpenArtifact && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-medium rounded-lg opacity-70 group-hover:opacity-100 transition-all text-primary hover:text-primary hover:bg-primary/10 min-h-[32px]"
                            onClick={() =>
                              onOpenArtifact({
                                id: Math.random().toString(36).slice(2),
                                type: match[1].toLowerCase() === "svg" ? "svg" : "html",
                                language: match[1].toLowerCase(),
                                content: codeString,
                                title: `${match[1].toUpperCase()} Preview`,
                              })
                            }
                          >
                            <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                            <span className="hidden sm:inline">Preview</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs md:text-sm font-medium rounded-lg opacity-50 group-hover:opacity-100 transition-all active:bg-white/10 active:scale-95 touch-manipulation min-h-[32px]"
                          onClick={() => copyToClipboard(codeString)}
                          aria-label="Copy code"
                        >
                        {copiedCode === codeString ? (
                          <>
                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5 text-green-400" />
                            <span className="hidden sm:inline text-green-400">Copied!</span>
                            <span className="sm:hidden text-green-400">✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                            <span className="hidden sm:inline">Copy</span>
                            <span className="sm:hidden">Copy</span>
                          </>
                        )}
                      </Button>
                      </div>{/* end buttons wrapper */}
                    </div>{/* end header */}
                    <div className="overflow-x-auto">
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="!mt-0 !rounded-none !bg-[#1e1e1e] text-xs sm:text-sm"
                        customStyle={{
                          margin: 0,
                          padding: '1rem',
                          fontSize: 'inherit'
                        }}
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                ) : (
                  <code
                    className="bg-primary/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm text-primary font-mono border border-primary/20"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              pre({ children }: any) {
                return <div className="my-3 sm:my-4">{children}</div>;
              },
              p({ children }: any) {
                return <div className="mb-2 sm:mb-3 md:mb-4 leading-relaxed sm:leading-loose text-xs sm:text-sm md:text-base text-foreground/90">{children}</div>;
              },
              h1({ children }: any) {
                return (
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 mt-5 sm:mt-6 text-foreground border-b border-border/30 pb-2">
                    {children}
                  </h1>
                );
              },
              h2({ children }: any) {
                return (
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 mt-4 sm:mt-5 text-foreground">
                    {children}
                  </h2>
                );
              },
              h3({ children }: any) {
                return (
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-2 mt-3 sm:mt-4 text-foreground">
                    {children}
                  </h3>
                );
              },
              ul({ children }: any) {
                return (
                  <ul className="list-disc list-outside ml-5 sm:ml-6 mb-3 sm:mb-4 space-y-1.5 sm:space-y-2 text-sm sm:text-base text-foreground/90">
                    {children}
                  </ul>
                );
              },
              ol({ children }: any) {
                return (
                  <ol className="list-decimal list-outside ml-5 sm:ml-6 mb-3 sm:mb-4 space-y-1.5 sm:space-y-2 text-sm sm:text-base text-foreground/90">
                    {children}
                  </ol>
                );
              },
              li({ children }: any) {
                return <li className="leading-relaxed marker:text-primary">{children}</li>;
              },
              a({ href, children }: any) {
                return (
                  <a
                    href={href}
                    className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                );
              },
              img({ src, alt }: any) {
                return (
                  <div className="my-4 rounded-xl overflow-hidden shadow-lg border-2 border-primary/10 hover:border-primary/30 transition-all duration-200 group">
                    <img
                      src={src}
                      alt={alt || "Image"}
                      className="w-full h-auto object-cover cursor-pointer group-hover:scale-[1.02] transition-transform duration-200"
                      onClick={() => window.open(src, '_blank')}
                      loading="lazy"
                    />
                  </div>
                );
              },
              blockquote({ children }: any) {
                return (
                  <blockquote className="border-l-4 border-primary/60 bg-primary/5 pl-4 pr-4 py-2 rounded-r-lg italic my-3 sm:my-4 text-muted-foreground text-sm sm:text-base">
                    {children}
                  </blockquote>
                );
              },
              table({ children }: any) {
                return (
                  <div className="overflow-x-auto my-3 sm:my-4 rounded-xl border border-border/50 shadow-md">
                    <table className="min-w-full divide-y divide-border text-sm sm:text-base">
                      {children}
                    </table>
                  </div>
                );
              },
              thead({ children }: any) {
                return <thead className="bg-gradient-to-r from-muted to-muted/70">{children}</thead>;
              },
              th({ children }: any) {
                return (
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-xs sm:text-sm uppercase tracking-wider text-foreground">
                    {children}
                  </th>
                );
              },
              td({ children }: any) {
                return (
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-foreground/90 border-t border-border/30">
                    {children}
                  </td>
                );
              },
            }}
          >
            {strippedContent}
          </ReactMarkdown>          )}        </div>
        
        {/* PDF Ready Banner - After Content (App Colors) */}
        {/* Reactions — only for AI messages */}
        {!isUser && (
          <div className="flex items-center gap-1.5 mt-2">
            <button
              onClick={() => {
                const next = reaction === "up" ? null : "up";
                setReaction(next);
                onReaction?.(message.id, next);
              }}
              title="Good response"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all duration-200 hover:scale-105 active:scale-95 ${
                reaction === "up"
                  ? "bg-green-500/15 border-green-500/50 text-green-500"
                  : "bg-transparent border-border/40 text-muted-foreground hover:border-green-500/40 hover:text-green-500 hover:bg-green-500/10"
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                const next = reaction === "down" ? null : "down";
                setReaction(next);
                onReaction?.(message.id, next);
              }}
              title="Bad response"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all duration-200 hover:scale-105 active:scale-95 ${
                reaction === "down"
                  ? "bg-red-500/15 border-red-500/50 text-red-500"
                  : "bg-transparent border-border/40 text-muted-foreground hover:border-red-500/40 hover:text-red-500 hover:bg-red-500/10"
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
            {reaction && (
              <span className={`text-[11px] animate-in fade-in duration-300 ${
                reaction === "up" ? "text-green-500" : "text-red-500"
              }`}>
                {reaction === "up" ? "Thanks for the feedback!" : "Sorry about that."}
              </span>
            )}
          </div>
        )}

        {/* Follow-up suggestions — only on the last AI message */}
        {!isUser && isLastMessage && message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-2">
              {message.suggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onSuggestionClick?.(q)}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-300 group flex items-center justify-between gap-3 w-full text-left text-sm px-4 py-3 rounded-2xl border border-border/40 bg-card/60 hover:bg-muted/60 hover:border-border/80 text-foreground/70 hover:text-foreground transition-all duration-200 backdrop-blur-sm"
                >
                  <span className="leading-snug">{q}</span>
                  <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-60 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
                </button>
              ))}
            </div>
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
            {/* Mobile drag handle */}
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