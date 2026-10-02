import { randomBytes, randomUUID } from "crypto";
import { db } from "../db";

export type InvitationStatus = "available" | "reserved" | "activated" | "revoked";

export type SchoolInvitation = {
  id: string;
  code: string;
  status: InvitationStatus;
  reservedEmail: string | null;
  reservedUntil: string | null;
  studentId: string | null;
  studentName: string | null;
  studentEmail: string | null;
  usedAt: string | null;
  createdAt: string;
};

export function generateInvitationCode(): string {
  const raw = randomBytes(8).toString("hex").toUpperCase();
  return `INV-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

function insertAvailable(schoolId: string) {
  db.prepare(
    "INSERT INTO school_invitations (id, school_id, code, status) VALUES (?, ?, ?, 'available')"
  ).run(randomUUID(), schoolId, generateInvitationCode());
}

export function releaseExpiredReservations(schoolId?: string) {
  if (schoolId) {
    db.prepare(`
      UPDATE school_invitations
      SET status = 'available', reserved_token = NULL, reserved_email = NULL, reserved_until = NULL
      WHERE school_id = ? AND status = 'reserved' AND reserved_until <= datetime('now')
    `).run(schoolId);
    return;
  }
  db.prepare(`
    UPDATE school_invitations
    SET status = 'available', reserved_token = NULL, reserved_email = NULL, reserved_until = NULL
    WHERE status = 'reserved' AND reserved_until <= datetime('now')
  `).run();
}

/** Keep non-revoked invitations aligned with licensed seats without touching activated students. */
export function syncSchoolInvitations(schoolId: string, seats: number) {
  releaseExpiredReservations(schoolId);
  const current = db.prepare(`
    SELECT id, status FROM school_invitations
    WHERE school_id = ? AND status != 'revoked'
    ORDER BY CASE status WHEN 'available' THEN 0 WHEN 'reserved' THEN 1 ELSE 2 END, created_at DESC
  `).all(schoolId) as { id: string; status: InvitationStatus }[];

  if (current.length < seats) {
    const tx = db.transaction(() => {
      for (let i = current.length; i < seats; i++) insertAvailable(schoolId);
    });
    tx();
    return;
  }

  if (current.length > seats) {
    const removable = current.filter((invite) => invite.status === "available");
    const removeCount = Math.min(current.length - seats, removable.length);
    const revoke = db.prepare("UPDATE school_invitations SET status = 'revoked', revoked_at = datetime('now') WHERE id = ?");
    const tx = db.transaction(() => {
      for (const invite of removable.slice(0, removeCount)) revoke.run(invite.id);
    });
    tx();
  }
}

export function listSchoolInvitations(schoolId: string): SchoolInvitation[] {
  releaseExpiredReservations(schoolId);
  const school = db.prepare("SELECT seats FROM schools WHERE id = ?").get(schoolId) as { seats: number } | undefined;
  if (school) syncSchoolInvitations(schoolId, school.seats);
  return db.prepare(`
    SELECT i.id, i.code, i.status,
           i.reserved_email AS reservedEmail,
           i.reserved_until AS reservedUntil,
           i.used_by_user_id AS studentId,
           u.name AS studentName,
           u.email AS studentEmail,
           i.used_at AS usedAt,
           i.created_at AS createdAt
    FROM school_invitations i
    LEFT JOIN users u ON u.id = i.used_by_user_id
    WHERE i.school_id = ?
    ORDER BY CASE i.status WHEN 'reserved' THEN 0 WHEN 'available' THEN 1 WHEN 'activated' THEN 2 ELSE 3 END,
             i.created_at DESC
  `).all(schoolId) as SchoolInvitation[];
}

export function replaceInvitation(schoolId: string, invitationId: string): SchoolInvitation | null {
  const row = db.prepare(
    "SELECT id, status FROM school_invitations WHERE id = ? AND school_id = ?"
  ).get(invitationId, schoolId) as { id: string; status: InvitationStatus } | undefined;
  if (!row || row.status === "activated") return null;

  const newId = randomUUID();
  const code = generateInvitationCode();
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE school_invitations
      SET status = 'revoked', revoked_at = datetime('now'), reserved_token = NULL,
          reserved_email = NULL, reserved_until = NULL
      WHERE id = ?
    `).run(row.id);
    db.prepare(
      "INSERT INTO school_invitations (id, school_id, code, status) VALUES (?, ?, ?, 'available')"
    ).run(newId, schoolId, code);
  });
  tx();
  return listSchoolInvitations(schoolId).find((invite) => invite.id === newId) ?? null;
}
