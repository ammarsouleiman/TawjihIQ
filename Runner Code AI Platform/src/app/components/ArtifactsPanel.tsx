import DOMPurify from "dompurify";
import { Check, Code2, Copy, ExternalLink, Maximize2, Minimize2, Monitor, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export interface Artifact {
  id: string;
  type: "html" | "svg" | "code";
  language: string;
  content: string;
  title: string;
}

interface ArtifactsPanelProps {
  artifact: Artifact | null;
  onClose: () => void;
}

type Tab = "preview" | "code";

const LANG_LABELS: Record<string, string> = {
  html: "HTML", svg: "SVG", jsx: "JSX", tsx: "TSX",
  javascript: "JS", typescript: "TS", css: "CSS", python: "Python",
};

export function ArtifactsPanel({ artifact, onClose }: ArtifactsPanelProps) {
  const [tab, setTab] = useState<Tab>("preview");
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (artifact) {
      setTab(artifact.type === "code" ? "code" : "preview");
      setIframeKey((k) => k + 1);
      setIsFullscreen(false);
    }
  }, [artifact?.id]);

  if (!artifact) return null;

  const canPreview = artifact.type === "html" || artifact.type === "svg";
  const langLabel = LANG_LABELS[artifact.language] ?? artifact.language.toUpperCase();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = artifact.content;
      ta.style.cssText = "position:fixed;left:-9999px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([artifact.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const ActionBtn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95 transition-all duration-150"
    >
      {children}
    </button>
  );

  return (
    <div className={`flex flex-col w-full h-full bg-background transition-all duration-300 ${
      isFullscreen ? "fixed inset-0 z-[60]" : ""
    }`}>

      {/* ── Top bar ── */}
      <div className="flex items-center gap-2 px-3 sm:px-4 h-11 border-b border-border/50 bg-card/60 backdrop-blur-sm flex-shrink-0">

        {/* Left: icon + badge + title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 flex-shrink-0">
            <Code2 className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold text-primary tracking-wider uppercase">{langLabel}</span>
          </div>
          <span className="text-xs text-foreground/60 font-medium truncate hidden sm:block">{artifact.title}</span>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {canPreview && (
            <ActionBtn onClick={handleOpenInNewTab} title="Open in new tab">
              <ExternalLink className="w-3.5 h-3.5" />
            </ActionBtn>
          )}
          {canPreview && (
            <ActionBtn onClick={() => setIframeKey((k) => k + 1)} title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </ActionBtn>
          )}
          <ActionBtn onClick={handleCopy} title="Copy code">
            {copied
              ? <Check className="w-3.5 h-3.5 text-green-400" />
              : <Copy className="w-3.5 h-3.5" />}
          </ActionBtn>
          <ActionBtn onClick={() => setIsFullscreen((f) => !f)} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen
              ? <Minimize2 className="w-3.5 h-3.5" />
              : <Maximize2 className="w-3.5 h-3.5" />}
          </ActionBtn>
          {/* Divider */}
          <div className="w-px h-4 bg-border/50 mx-1" />
          <ActionBtn onClick={onClose} title="Close">
            <X className="w-3.5 h-3.5" />
          </ActionBtn>
        </div>
      </div>

      {/* ── Tabs ── */}
      {canPreview && (
        <div className="flex border-b border-border/40 flex-shrink-0 bg-muted/5 px-1">
          {(["preview", "code"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium capitalize transition-all select-none ${
                tab === t
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              {t === "preview" && <Monitor className="w-3 h-3" />}
              {t === "code" && <Code2 className="w-3 h-3" />}
              {t}
              {tab === t && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden relative">

        {/* HTML Preview */}
        {tab === "preview" && artifact.type === "html" && (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            srcDoc={artifact.content}
            sandbox="allow-scripts allow-forms"
            className="w-full h-full border-0"
            style={{ background: "white" }}
            title="HTML Preview"
          />
        )}

        {/* SVG Preview */}
        {tab === "preview" && artifact.type === "svg" && (
          <div className="w-full h-full flex items-center justify-center p-8 overflow-auto bg-[repeating-conic-gradient(#80808015_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]">
            <div
              className="max-w-full max-h-full drop-shadow-xl"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(artifact.content, { USE_PROFILES: { svg: true, svgFilters: true } }) }}
            />
          </div>
        )}

        {/* Code View */}
        {(tab === "code" || artifact.type === "code") && (
          <div className="h-full overflow-auto">
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={artifact.language}
              PreTag="div"
              className="!mt-0 !rounded-none min-h-full"
              customStyle={{
                margin: 0,
                padding: "1.25rem 1rem",
                minHeight: "100%",
                background: "#1a1a1a",
                fontSize: "0.8rem",
                lineHeight: "1.6",
              }}
              showLineNumbers
              lineNumberStyle={{ color: "#444", fontSize: "0.7rem", minWidth: "2.8rem", paddingRight: "1rem", userSelect: "none" }}
            >
              {artifact.content}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    </div>
  );
}
