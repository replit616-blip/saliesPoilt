/*
# Create notifications

## Purpose
Per-user notifications created by real platform events (password reset requests and decisions).

## New table
- notifications: one row per recipient. Stores type, title, body, link path, read timestamp,
  and a dedupe key so the same event does not create duplicate rows.

## Security
- RLS is enabled with no policies. The roster edge function uses the service role and enforces
  that each user only reads and updates their own notifications, because sign-in runs through Firebase
  rather than Supabase Auth.
- No grants to anon or authenticated roles.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link_path text,
  dedupe_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications (recipient_member_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
