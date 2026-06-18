# AGENTS.md

Root instructions for agent work in this repo. Read the current docs for the area you touch, then prefer the nearest subtree `AGENTS.md`.

## Read Order

1. [`docs/agent_handoff.md`](docs/agent_handoff.md)
2. For app/feed work: [`docs/app/app_spec.md`](docs/app/app_spec.md), [`docs/app/feed.md`](docs/app/feed.md)
3. For admin/automation work: [`docs/admin/admin_spec.md`](docs/admin/admin_spec.md), [`docs/admin/automation.md`](docs/admin/automation.md)
4. [`docs/agent_learnings.md`](docs/agent_learnings.md)
5. Subtree notes: [`frontend/AGENTS.md`](frontend/AGENTS.md), [`backend/AGENTS.md`](backend/AGENTS.md), or [`mobile/AGENTS.md`](mobile/AGENTS.md)

## Repo Rules

- Update the docs when you make a significant change to routes, pages, APIs, schema, auth/roles, shared components, admin workflows, job behavior, or feed behavior.
- Do not update docs for minor bug fixes, typo fixes, or styling noise unless behavior changed.
- Keep local `wiki/` notes current when work changes setup, troubleshooting, workflow commands, product planning, MVP scope, or build status. For feature work, update/recheck `wiki/build-status.md` before finalizing and mention it if changed.
- After code changes, tell the user whether they need to refresh or restart the frontend terminal, backend terminal, phone simulator, or other local dev process for the change to take effect.
- Prefer shared components over page-specific copies when the same UI appears in more than one place.
- Keep admin actions separate from user-facing actions.
- Record repeatable pitfalls or invariants in `docs/agent_learnings.md`.

## Scope

This file is the general project index. More specific subtree `AGENTS.md` files take precedence inside their subtree.
