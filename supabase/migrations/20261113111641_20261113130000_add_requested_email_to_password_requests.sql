/*
# Add requested_email to password_change_requests

## Purpose
The unauthenticated "request approval by email" path needs to rate-limit by
the requested email address without exposing whether an account exists.
Storing the requested email on the request row enables an hourly cap.

## Changes
1. `password_change_requests.requested_email` (text, nullable) — the email
   typed by the requester; for authenticated requests it is the member's own
   email. Nullable so existing rows remain valid.
2. Index on (requested_email, requested_at) for the rate-limit count query.

## Security
- No new grants; table stays service-role only with RLS enabled.

## Notes
- Idempotent: safe to re-run.
*/

ALTER TABLE password_change_requests
  ADD COLUMN IF NOT EXISTS requested_email text;

CREATE INDEX IF NOT EXISTS idx_pcr_requested_email_time
  ON password_change_requests (requested_email, requested_at);
