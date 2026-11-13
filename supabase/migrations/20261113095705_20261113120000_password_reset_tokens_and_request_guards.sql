/*
# Password reset tokens and request guards

## Purpose
Phase 1B of the password-reset system. Adds secure single-use recovery tokens
approved by admins, and guards against duplicate pending requests.

## Changes
1. New table `password_reset_tokens`:
   - `id` (uuid, primary key)
   - `request_id` (uuid, links to the approved password_change_requests row)
   - `member_id` (uuid, the requester)
   - `token_hash` (text, SHA-256 hex of the raw token — raw token is NEVER stored)
   - `browser_fingerprint` (text, the browser that started the request)
   - `expires_at` (timestamptz, 15 minutes after issue)
   - `used_at` (timestamptz, null until consumed; consumption is atomic)
   - `created_at` (timestamptz)
2. Partial unique index on `password_change_requests`:
   at most one `pending` request per member, preventing duplicate floods
   and closing the check-then-insert race at the database level.
3. No RLS/grant changes needed for the new table: it is only accessed through
   the service-role edge-function client, and RLS is enabled with no grants.

## Security
- Only a SHA-256 hash of each recovery token is stored; the raw token exists
  only in the approval response once and is never persisted.
- Tokens are single-use: consumption flips `used_at` atomically inside the
  edge function conditional update (`used_at IS null AND expires_at > now()`).
- No client-facing grants or policies; table is service-role only.

## Notes
- Idempotent: safe to re-run.
- Existing request data is untouched.
*/

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES password_change_requests(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  browser_fingerprint text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_request_per_member
  ON password_change_requests (member_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
  ON password_reset_tokens (token_hash);
