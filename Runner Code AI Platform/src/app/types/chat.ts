export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string; // What user sees in chat
  timestamp: number;
  imageUrl?: string; // For displaying single image in chat (legacy support)
  imageUrls?: string[]; // For displaying multiple images in chat
  pdfUrl?: string; // For displaying PDF documents in chat
  aiContent?: string; // Full content sent to AI (includes PDF text in background)
  suggestions?: string[]; // Follow-up question suggestions shown below last AI message
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
  /** Whether the conversation is pinned to the top of the sidebar. */
  pinned?: boolean;
  /** Unsent draft text saved server-side. */
  draft?: string;
  /** Optional project this conversation belongs to. null/undefined = "Recents". */
  projectId?: string | null;
}

/**
 * A Project is a Claude-style folder that groups related conversations and
 * carries a shared system prompt ("instructions") that gets injected into
 * every chat opened inside it.
 */
export interface Project {
  id: string;
  name: string;
  /** CSS hex color (#rrggbb) used for the sidebar dot and project header. */
  color: string;
  /** Free-form system prompt applied to every conversation in this project. */
  instructions: string;
  createdAt: number;
  updatedAt: number;
}
