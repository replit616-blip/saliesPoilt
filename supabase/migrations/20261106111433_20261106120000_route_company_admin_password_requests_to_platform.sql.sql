/*
# Route company manager password requests to platform owners

## Purpose
Password reset requests submitted by company managers (COMPANY_ADMIN) were stored
with target_role = 'company', so they were filtered out of the platform owners' list.
Company managers' requests must be reviewed by platform owners.

## Changes
1. Pending password_change_requests whose member is a COMPANY_ADMIN are re-targeted to 'platform'.
   No rows are deleted and no other columns change.

## Security
No RLS or grant changes.

## Notes
- Idempotent: running it again only touches rows still set to 'company'.
*/

UPDATE password_change_requests AS pcr
SET target_role = 'platform'
FROM members AS m
WHERE m.id = pcr.member_id
  AND m.role = 'COMPANY_ADMIN'
  AND pcr.status = 'pending'
  AND pcr.target_role IS DISTINCT FROM 'platform';
