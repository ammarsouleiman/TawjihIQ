import { Bug, Code2, Database, FileText, GitBranch, Globe, LayoutTemplate, Lightbulb, Moon, Rocket, Search, Shield, Sparkles, Sun, Sunrise, Terminal, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import logo from "../../assets/3546325734eebbae935ba64a28db9c350a382fdd.png";
import { useAuth } from "../context/AuthContext";

interface WelcomeScreenProps {
  onSuggestionClick?: (text: string) => void;
}

const ALL_CHIPS = [
  { icon: Zap,            label: "Write a React component",   prompt: "Write me a clean React component with TypeScript" },
  { icon: Bug,            label: "Debug my code",              prompt: "Help me debug my code" },
  { icon: FileText,       label: "Explain async/await",        prompt: "Explain how async/await works in JavaScript with examples" },
  { icon: LayoutTemplate, label: "Design a REST API",          prompt: "Help me design a REST API for a web application" },
  { icon: Code2,          label: "Analyze data",               prompt: "Help me analyze and visualize data" },
  { icon: Lightbulb,      label: "Brainstorm ideas",           prompt: "Help me brainstorm creative ideas for my project" },
  { icon: Search,         label: "Code review",                prompt: "Review my code and suggest improvements" },
  { icon: FileText,       label: "Write documentation",        prompt: "Help me write clear documentation for my project" },
  { icon: Database,       label: "Design a database schema",   prompt: "Help me design a database schema for my application" },
  { icon: Shield,         label: "Improve security",           prompt: "Review my code for security vulnerabilities and suggest fixes" },
  { icon: Rocket,         label: "Optimize performance",       prompt: "How can I optimize my code for better performance?" },
  { icon: Terminal,       label: "Write a shell script",       prompt: "Help me write a shell script to automate a task" },
  { icon: GitBranch,      label: "Explain Git workflow",       prompt: "Explain the best Git workflow for a team project" },
  { icon: Code2,          label: "Refactor my code",           prompt: "Help me refactor this code to be more clean and maintainable" },
  { icon: LayoutTemplate, label: "Build a landing page",       prompt: "Design a modern landing page with HTML and CSS" },
  { icon: Lightbulb,      label: "Learn a new concept",        prompt: "Teach me a new programming concept I should know" },
];

const CHIPS_TO_SHOW = 8;

function pickRandom<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function getGreeting(hour: number): { text: string; Icon: typeof Sun } {
  if (hour >= 5 && hour < 12) return { text: "Good morning", Icon: Sunrise };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", Icon: Sun };
  if (hour >= 17 && hour < 21) return { text: "Good evening", Icon: Sun };
  return { text: "Good night", Icon: Moon };
}

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  const { user } = useAuth();
  const subtitle = "Your complete AI assistant — elite in programming";
  const [displayed, setDisplayed] = useState("");
  const [chipsVisible, setChipsVisible] = useState(false);

  // Stable pick for the lifetime of the component (per mount)
  const chips = useMemo(() => pickRandom(ALL_CHIPS, CHIPS_TO_SHOW), []);
  const greeting = useMemo(() => getGreeting(new Date().getHours()), []);
  const displayName = useMemo(() => {
    if (!user?.name) return "";
    const parts = user.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    // Show first + last name when available; fall back to first name only.
    return parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
  }, [user?.name]);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(subtitle.slice(0, i));
      if (i >= subtitle.length) {
        clearInterval(timer);
        setChipsVisible(true);
      }
    }, 28);
    return () => clearInterval(timer);
  }, []);

  const GreetingIcon = greeting.Icon;

  return (
    <div className="flex items-center justify-center h-full overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y">
      <div className="max-w-2xl text-center w-full px-5 sm:px-8 py-8 sm:py-10 my-auto safe-area-inset">

        {/* -- Hero -- */}
        <div className="mb-7 sm:mb-9">
          {/* Greeting badge */}
          {displayName && (
            <div className="inline-flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded-full bg-card border border-border/60 text-xs font-medium text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-500">
              <GreetingIcon className="w-3.5 h-3.5 text-primary" />
              <span>{greeting.text},</span>
              <span className="font-semibold text-foreground">{displayName}</span>
            </div>
          )}

          <img
            src={logo}
            alt="Runner Code AI"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-lg mx-auto mb-4 sm:mb-5"
          />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent mb-2"
            style={{ backgroundSize: '200% auto', animation: 'shimmer-sweep 4s linear infinite' }}
          >
            Runner Code AI
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground font-medium min-h-[1.5em]">
            {displayed}
            <span className={`inline-block w-0.5 h-4 ml-0.5 bg-primary align-middle ${displayed.length < subtitle.length - 1 ? 'animate-pulse' : 'opacity-0'}`} />
          </p>
          <a
            href="https://runner-code.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-card border border-border/60 hover:border-primary/50 hover:text-primary text-xs text-muted-foreground transition-all"
          >
            <Globe className="w-3.5 h-3.5" />
            runner-code.com
          </a>
        </div>

        {/* -- Suggestion Chips -- */}
        <div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm sm:text-base font-semibold text-foreground">Try asking me...</span>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-2.5 justify-center">
            {chips.map(({ icon: Icon, label, prompt }, idx) => (
              <button
                key={`${label}-${idx}`}
                onClick={() => onSuggestionClick?.(prompt)}
                style={{ animationDelay: `${idx * 55}ms` }}
                className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-card border border-border/60 text-xs sm:text-sm text-foreground font-medium hover:border-primary/60 hover:bg-primary/10 hover:text-primary active:scale-95 transition-all cursor-pointer touch-manipulation shadow-sm ${chipsVisible ? 'animate-in fade-in slide-in-from-bottom-3 fill-mode-both' : 'opacity-0'}`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-primary/70" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/50">© 2026 Runner Code AI</p>
      </div>
    </div>
  );
}
