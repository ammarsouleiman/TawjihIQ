import { randomUUID } from "crypto";
import { db } from "../db";

export type SupportRole = "admin" | "owner";
export const MAX_SUPPORT_MESSAGE = 2000;

export type SupportMessage = {
  id: string;
  senderRole: SupportRole;
  senderName: string | null;
  body: string;
  createdAt: string;
  readAt: string | null;
};

const SELECT_MESSAGES = `
  SELECT m.id, m.sender_role AS senderRole, u.name AS senderName, m.body,
         m.created_at AS createdAt, m.read_at AS readAt
    FROM support_messages m
    LEFT JOIN users u ON u.id = m.sender_id
   WHERE m.school_id = ?`;

export function listSupportMessages(schoolId: string): SupportMessage[] {
  // Latest 300, returned oldest-first for display.
  return (db
    .prepare(`${SELECT_MESSAGES} ORDER BY m.created_at DESC, m.rowid DESC LIMIT 300`)
    .all(schoolId) as SupportMessage[]).reverse();
}

// Marks the other side's messages as read by `reader`.
export function markSupportRead(schoolId: string, reader: SupportRole) {
  db.prepare(
    "UPDATE support_messages SET read_at = datetime('now') WHERE school_id = ? AND sender_role != ? AND read_at IS NULL"
  ).run(schoolId, reader);
}

export function supportUnread(schoolId: string, reader: SupportRole): number {
  return (db
    .prepare("SELECT COUNT(*) AS c FROM support_messages WHERE school_id = ? AND sender_role != ? AND read_at IS NULL")
    .get(schoolId, reader) as { c: number }).c;
}

// Returns an error message, or the stored message.
export function addSupportMessage(
  schoolId: string,
  senderId: string,
  role: SupportRole,
  rawBody: unknown
): { error: string } | { message: SupportMessage } {
  const body = String(rawBody ?? "").trim();
  if (!body) return { error: "Message cannot be empty." };
  if (body.length > MAX_SUPPORT_MESSAGE) return { error: `Message is too long (max ${MAX_SUPPORT_MESSAGE} characters).` };
  const id = randomUUID();
  db.prepare("INSERT INTO support_messages (id, school_id, sender_id, sender_role, body) VALUES (?, ?, ?, ?, ?)")
    .run(id, schoolId, senderId, role, body);
  const message = db.prepare(`${SELECT_MESSAGES} AND m.id = ?`).get(schoolId, id) as SupportMessage;
  return { message };
}
