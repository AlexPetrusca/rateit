# Agent Learnings

This file is a running record of repeatable implementation lessons, invariants, and repo-specific pitfalls that future agents should keep in mind.

## What Belongs Here

Add an entry when you learn something that is likely to matter again later, such as:

- a recurring integration pitfall
- a schema or payload compatibility rule
- a shared component convention that should not be broken
- a backend/frontend mismatch that caused an avoidable failure
- a test or build expectation that future changes should preserve

Do not use this file for:

- one-off bug tickets
- minor styling changes
- transient implementation noise

## Current Learnings

### Shared UI

- Reuse existing shared components before creating page-specific copies for feed, post, comment, avatar, modal, notification, or admin grid UI.
- The home feed and profile feed should stay visually aligned and should share the same backing rendering path when possible.
- Use `sx` for MUI layout styling unless the component API clearly expects a different prop.

### Admin

- Keep admin delete flows separate from user-facing delete behavior.
- Any new admin table should use the shared admin grid wrapper so alignment and selection stay consistent.
- Any new admin job type must update the enum, schema constraint, service dispatch, controller, UI, and docs together.
- Comment moderation needs subtree-aware deletion; deleting a parent comment should delete all nested replies before removing the parent row.

### Backend JSON and time types

- If a custom `ObjectMapper` is introduced, it must register modules so Java time types like `Instant` round-trip correctly.
- Job payload/result JSON should be backward-compatible enough that older queued jobs can still be opened in the UI.

### Auth and roles

- `ROLE_ADMIN` is the backend authorization guard for admin APIs.
- `ROLE_TEST_USER` is reserved for synthetic accounts and test-user OTP bypass behavior.
- User role state lives on the `users` row and must stay consistent with JWT/session handling.
- The live `users` table still requires legacy `first_name` and `last_name` columns, so create/update flows must populate them even though the UI is username-first.

## How To Update

When you discover a reusable lesson during implementation, add it here and keep it short. Prefer a single sentence that captures the invariant or pitfall.
