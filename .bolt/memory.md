# Project memory

## Product intent & audience

- Roster/registration management app with email-based authentication.
- Users log in and are automatically linked to pre-registered roster entries by email on first login.
- Audience: Arabic-speaking users (UI copy includes Arabic strings, e.g. "تعذر تحميل حسابك").

## Brand personality & voice

- Assistant communicates with user in Egyptian Arabic dialect.
- UI error messages are user-friendly and generic (hide backend specifics).

## Visual design & UX direction

- Framework: Vite + React.
- Login flow calls a backend `me` check after authentication; failure surfaces "We could not load your account" / "تعذر تحميل حسابك".
- UX pattern: frontend degrades to generic account-load error when backend is unreachable or returns failure.

## Decisions, constraints & rationale

- Backend function named `roster` must be deployed for login to work; an empty published-functions list causes all post-login requests to fail before reaching data.
- Firebase project configuration (API keys / project info) is required for the backend to verify login identity — was missing/unconfigured at one point.
- Fix applied: published the `roster` function and bumped its version number to force redeploy.
- A diagnostic report exists covering a planned password-system fix; to be continued after login is confirmed working.

## Open questions & assumptions

- Whether "We could not load your account" can recur from causes other than the undeployed `roster` function (user asked to report if it reappears).
- Whether Firebase keys are now fully configured and persisting across deploys.
- Password system fix plan details (referenced diagnostic report) — not yet captured here.