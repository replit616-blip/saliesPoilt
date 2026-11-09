import { db, type MemberRow } from "./db.ts";
import { HttpError } from "./http.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notificationId(body: Record<string, unknown>): string {
  if (typeof body.id !== "string" || !UUID_PATTERN.test(body.id)) throw new HttpError(422, "invalid_id");
  return body.id;
}

interface NotificationInput {
  type: string;
  title: string;
  body?: string | null;
  linkPath?: string | null;
  dedupeKey: string;
}

export async function notifyMembers(recipientIds: string[], input: NotificationInput): Promise<void> {
  if (recipientIds.length === 0) return;
  const rows = recipientIds.map((id) => ({
    recipient_member_id: id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link_path: input.linkPath ?? null,
    dedupe_key: `${input.dedupeKey}:${id}`,
  }));
  const { error } = await db.from("notifications").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) throw error;
}

export async function passwordRequestRecipients(targetRole: string, companyId: string | null, requesterId: string): Promise<string[]> {
  let query = db.from("members").select("id");
  if (targetRole === "platform") {
    query = query.in("role", ["OWNER", "SUPER_ADMIN"]);
  } else {
    if (!companyId) return [];
    query = query.eq("company_id", companyId).eq("role", "COMPANY_ADMIN");
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => row.id as string).filter((id) => id !== requesterId);
}

export async function listNotifications(actor: MemberRow) {
  const { data, error } = await db
    .from("notifications")
    .select("id, type, title, body, link_path, created_at, read_at")
    .eq("recipient_member_id", actor.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const notifications = data ?? [];
  return {
    notifications,
    unreadCount: notifications.filter((item) => item.read_at === null).length,
  };
}

export async function markNotificationRead(actor: MemberRow, body: Record<string, unknown>) {
  const id = notificationId(body);
  const { error } = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_member_id", actor.id)
    .is("read_at", null);
  if (error) throw error;
  return { ok: true };
}

export async function markAllNotificationsRead(actor: MemberRow) {
  const { error } = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_member_id", actor.id)
    .is("read_at", null);
  if (error) throw error;
  return { ok: true };
}

export async function deleteNotification(actor: MemberRow, body: Record<string, unknown>) {
  const id = notificationId(body);
  const { error } = await db.from("notifications").delete().eq("id", id).eq("recipient_member_id", actor.id);
  if (error) throw error;
  return { ok: true };
}
