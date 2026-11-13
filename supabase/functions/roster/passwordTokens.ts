import { db } from "./db.ts";
import { HttpError } from "./http.ts";

export interface StoredResetKeyInput {
  requestId: string;
  memberId: string;
  resetKeyHash: string;
  fingerprint: string | null;
}

/**
 * Stores the client-generated reset key hash for a new request. The raw key
 * never leaves the requester's browser; only its SHA-256 hex is persisted.
 */
export async function storeClientResetKey(input: StoredResetKeyInput): Promise<void> {
  const { error } = await db.from("password_reset_tokens").insert({
    request_id: input.requestId,
    member_id: input.memberId,
    token_hash: input.resetKeyHash,
    browser_fingerprint: input.fingerprint,
  });
  if (error && !isDuplicateKeyError(error)) throw error;
}

export interface ResetTokenContext {
  tokenId: string;
  requestId: string;
  memberId: string;
}

/**
 * Atomically consumes the stored reset key: verifies hash, expiry, browser
 * fingerprint, and single-use in one conditional update, so two concurrent
 * submissions cannot both succeed.
 */
export async function consumeResetKey(rawKey: string, fingerprint: string): Promise<ResetTokenContext> {
  const tokenHash = await sha256Hex(rawKey);
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("password_reset_tokens")
    .update({ used_at: now })
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gt("expires_at", now)
    .eq("browser_fingerprint", fingerprint)
    .select("id, request_id, member_id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(403, "invalid_reset_token");
  return data as ResetTokenContext;
}

/**
 * Releases a consumed token if a later step failed, so the requester can
 * retry instead of waiting for expiry.
 */
export async function releaseResetKey(tokenId: string): Promise<void> {
  const { error } = await db.from("password_reset_tokens").update({ used_at: null }).eq("id", tokenId);
  if (error) throw error;
}

/** True when the browser fingerprint has a valid, unconsumed approved reset. */
export async function findApprovedResetContext(fingerprint: string): Promise<{ requestId: string } | null> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("password_reset_tokens")
    .select("id, request_id, request:request_id(status)")
    .eq("browser_fingerprint", fingerprint)
    .is("used_at", null)
    .gt("expires_at", now)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const request = (data as { request: { status: string } | null }).request;
  if (!request || request.status !== "approved") return null;
  return { requestId: (data as { request_id: string }).request_id };
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isDuplicateKeyError(error: { code?: string; message?: string }): boolean {
  return error?.code === "23505" || (typeof error?.message === "string" && error.message.includes("duplicate key"));
}
