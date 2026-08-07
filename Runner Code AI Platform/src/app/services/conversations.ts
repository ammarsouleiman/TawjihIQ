import { apiFetch } from "../context/AuthContext";
import { Conversation } from "../types/chat";

const BACKEND_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Parse a value that may be a Unix ms timestamp or a SQLite datetime string (UTC). */
function parseTs(val: unknown, fallback = Date.now()): number {
  if (!val) return fallback;
  const n = Number(val);
  if (!isNaN(n) && n > 0) return n;                       // already a number
  // SQLite stores UTC without 'Z' — append it so Date.parse works correctly
  const str = String(val).trim();
  const normalized = str.includes("T") || str.endsWith("Z") ? str : str.replace(" ", "T") + "Z";
  const parsed = Date.parse(normalized);
  return isNaN(parsed) ? fallback : parsed;
}

export async function loadConversationsFromServer(): Promise<Conversation[]> {
  const res = await apiFetch(`${BACKEND_URL}/api/conversations`);
  if (!res.ok) throw new Error("Failed to load conversations");
  const data: any[] = await res.json();
  return data.map((c) => ({
    id: c.id,
    title: c.title,
    model: c.model,
    pinned: !!c.pinned,
    draft: c.draft ?? undefined,
    projectId: c.projectId ?? c.project_id ?? null,
    createdAt: parseTs(c.createdAt ?? c.created_at),
    updatedAt: parseTs(c.updatedAt ?? c.updated_at),
    messages: (c.messages ?? []).map((m: any) => ({
      ...m,
      timestamp: parseTs(m.timestamp, parseTs(c.createdAt ?? c.created_at)),
    })),
  }));
}

export async function saveConversationToServer(conv: Conversation): Promise<void> {
  await apiFetch(`${BACKEND_URL}/api/conversations/${conv.id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(conv),
  });
}

export async function deleteConversationFromServer(id: string): Promise<void> {
  await apiFetch(`${BACKEND_URL}/api/conversations/${id}`, {
    method: "DELETE",
  });
}

export async function saveReaction(
  messageId: string,
  conversationId: string,
  reaction: "up" | "down"
): Promise<void> {
  await apiFetch(`${BACKEND_URL}/api/reactions`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ messageId, conversationId, reaction }),
  });
}

export async function removeReaction(messageId: string): Promise<void> {
  await apiFetch(`${BACKEND_URL}/api/reactions/${messageId}`, {
    method: "DELETE",
  });
}

export async function loadReactions(
  conversationId: string
): Promise<Record<string, "up" | "down">> {
  const res = await apiFetch(`${BACKEND_URL}/api/reactions/${conversationId}`);
  if (!res.ok) return {};
  const data: { message_id: string; reaction: string }[] = await res.json();
  return Object.fromEntries(
    data.map((r) => [r.message_id, r.reaction as "up" | "down"])
  );
}

export async function loadMediaForConversation(
  conversationId: string
): Promise<Record<string, { imageUrl?: string; imageUrls?: string[]; pdfUrl?: string }>> {
  const res = await apiFetch(`${BACKEND_URL}/api/media/${conversationId}`);
  if (!res.ok) return {};
  return res.json();
}
