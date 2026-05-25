# Admin Automation

This document covers the database-backed admin automation queue used to generate synthetic users, posts, comments, and likes.

## Purpose

The automation system exists to seed and stress the environment with configurable test data. It is intentionally dumb at the content-generation layer for now, but it is structured enough to support future scenarios and recommendation testing.

## Access Pattern

- The automation UI lives at `/admin/jobs`.
- Jobs are queued from the frontend.
- A backend worker drains the queue.
- Job payloads and results are stored in the database.
- Clicking a job opens a modal with a human-readable explanation.

## Job States

- `PENDING`
- `IN_PROGRESS`
- `DONE`
- `FAILED`

## Job Types

- `CREATE_USER`
- `CREATE_POST`
- `CREATE_COMMENT`
- `CREATE_LIKE`

## Current Behavior

- `CREATE_USER` creates synthetic test accounts with `ROLE_TEST_USER`.
- `CREATE_POST` creates synthetic posts from active test users.
- `CREATE_COMMENT` creates threaded comments from active test users on public posts.
- `CREATE_LIKE` creates likes from active test users on public posts.
- completed create-user jobs show the actual users that were created
- comments can be threaded
- likes skip duplicates

## Backend Surface

- `AdminJobController`
- `AdminJobService`
- `AdminJobProcessor`
- `AdminJobSchemaUpdater`

## Implementation Map

If you are changing the automation queue, these are the first files to inspect:

- automation UI: `frontend/src/pages/AdminJobs.jsx`
- frontend API wrapper: `frontend/src/services/BackendApiService.js`
- backend controller: `backend/src/main/java/com/rateit/backend/controller/AdminJobController.java`
- backend queueing and detail logic: `backend/src/main/java/com/rateit/backend/service/AdminJobService.java`
- backend worker: `backend/src/main/java/com/rateit/backend/service/AdminJobProcessor.java`
- enum of supported job types: `backend/src/main/java/com/rateit/backend/entity/types/AdminJobType.java`
- job schema constraint updater: `backend/src/main/java/com/rateit/backend/config/AdminJobSchemaUpdater.java`

### API surface used by automation

- `GET /api/admin/jobs`
- `GET /api/admin/jobs/{jobId}`
- `POST /api/admin/jobs/create-users`
- `POST /api/admin/jobs/create-posts`
- `POST /api/admin/jobs/create-comments`
- `POST /api/admin/jobs/create-likes`

## Payload and Result Shape

The job queue stores JSON payloads and results in `admin_jobs`.

Current request payloads:

- create users: `{ "count": 20, "usernamePrefix": "test_user", "phonePrefix": "+1555000" }`
- create posts: `{ "count": 20, "bodyPrefix": "", "reviewPrefix": "" }`
- create comments: `{ "count": 20, "maxDepth": 3, "replyChance": 0.5, "commentPrefix": "", "replyPrefix": "" }`
- create likes: `{ "count": 20 }`

Current result payloads:

- users: `{ "createdUsers": [...], "count": N }`
- posts: `{ "createdPosts": [...], "count": N }`
- comments: `{ "createdComments": [...], "count": N }`
- likes: `{ "createdLikes": [...], "count": N }`

## UI Surface

- job queue listing
- job creation forms for each job type
- job detail modal
- result inspection for created users, posts, comments, and likes

## Invariants

- Admin APIs are protected by `ROLE_ADMIN`.
- Test-user automation uses `ROLE_TEST_USER`.
- Any new job type should update the schema constraint, service dispatch, UI, and docs together.
- Job result JSON should remain backward-compatible enough that older queued jobs can still be opened.

## Next Automation Work

- move the hardcoded generation rules into DB-backed scenarios
- store phrase banks and templates in the database
- make runs configurable instead of fixed to the current forms
- preserve deterministic seeding so runs can be reproduced
