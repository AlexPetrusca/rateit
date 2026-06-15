# AGENTS.md

This is the root index for agent work in this repo. Start here, then read the narrower docs that match the area you are changing.

## Read Order

1. [`docs/agent_handoff.md`](docs/agent_handoff.md) for the current snapshot of the app.
2. [`docs/app/app_spec.md`](docs/app/app_spec.md) for the main product surface.
3. [`docs/app/feed.md`](docs/app/feed.md) for the feed and post/comment contract.
4. [`docs/admin/admin_spec.md`](docs/admin/admin_spec.md) for the admin and automation surface.
5. [`docs/admin/automation.md`](docs/admin/automation.md) for the job queue and synthetic-data pipeline.
6. [`docs/agent_handoff.md`](docs/agent_handoff.md) for the remaining roadmap notes.
7. [`docs/agent_learnings.md`](docs/agent_learnings.md) for recurring repo lessons and invariants.
8. [`frontend/AGENTS.md`](frontend/AGENTS.md) when working in the frontend subtree.
9. [`backend/AGENTS.md`](backend/AGENTS.md) when working in the backend subtree.

## Repo Rules

- Update the docs when you make a significant change to routes, pages, APIs, schema, auth/roles, shared components, admin workflows, job behavior, or feed behavior.
- Do not update docs for minor bug fixes, typo fixes, or styling noise unless behavior changed.
- Keep the local `wiki/` notes up to date when work changes local setup, troubleshooting steps, workflow commands, product planning, MVP scope, or build status. `wiki/` is intentionally gitignored, so these notes are for local continuity rather than committed documentation.
- Keep `wiki/build-status.md` current when a feature is started, completed, descoped, moved between MVP and post-MVP, or when new to-do items are discovered.
- Before finalizing or pushing feature work, re-open `wiki/build-status.md` and confirm completed items moved out of To Do and into Completed. Mention this check in the final response when build-status changed.
- Create or update a local wiki page for every new feature area you build, including the main product decision behind it and any notable tradeoffs or reversals. Keep these pages in `wiki/` so the reasoning lives beside the other local notes.
- After code changes, tell the user whether they need to refresh or restart the frontend terminal, backend terminal, phone simulator, or other local dev process for the change to take effect.
- Prefer shared components over page-specific copies when the same UI appears in more than one place.
- Prefer existing docs over re-explaining the same design in code comments.
- Keep admin actions separate from user-facing actions.
- When you discover a repeatable pitfall or invariant, record it in `docs/agent_learnings.md`.

## Scope

This file is the general project index. If you are working inside a subsystem and later add a more specific `AGENTS.md` file there, that file should take precedence for that subtree.
