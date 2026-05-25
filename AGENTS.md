# AGENTS.md

This repository is meant to be handed between agents. Keep the docs current enough that a new agent can understand the app without reconstructing recent work from git history.

## When To Update Docs

Update the docs when you make a significant change to:

- routes or pages
- backend APIs
- data model or schema
- auth/roles/security behavior
- shared frontend components
- admin workflows
- job queue behavior
- feed or content rendering behavior

Do not update docs for minor bug fixes, typo fixes, styling noise, or one-off issue tickets unless they materially change behavior.

## What To Update

At minimum, keep these current:

- `docs/agent_handoff.md`
- `docs/feed.md`
- `docs/design_doc.md`

If the project structure changes, update `README.md` as well so the entry points stay obvious.

## How To Write The Update

- Describe the current state, not the history of how you got there.
- Prefer concrete API/page/component names over vague summaries.
- If you add a new shared UI component, document when it should be reused.
- If you add a new admin flow, document the request, job/state shape, and where to find the UI.
- If you change behavior that future work depends on, write down the new invariant.

## Good Triggers

Examples of changes that should trigger a doc update:

- adding or removing a page
- changing auth or role behavior
- changing the feed contract
- adding a new admin job type
- changing how posts/comments are rendered
- adding a new reusable component that should be preferred in future work

## Working Rule

If you are about to finish a substantial feature and the docs are now out of date, update the docs before you stop.
