# Agent Handoff

This file is the entry point for a new agent joining the repo. Read it first, then use the linked docs for the feed and the broader system shape.

## Current Product State

RateIt is a React + Spring Boot app with phone-number login, JWT cookie auth, a public feed of ratings, threaded comments, re-rating, user profiles, a post detail page, and an admin area for moderation plus synthetic-data automation.

### What is implemented now

- Phone OTP auth, including a test-user bypass where `ROLE_TEST_USER` accounts accept OTP `000000`.
- Login phone input remembers the last value locally and exposes proper browser autofill hooks.
- JWT cookie auth with role-based backend security.
- Admin-only APIs under `/api/admin/**` guarded by `ROLE_ADMIN`.
- Infinite-scroll home feed with pagination in chunks of 5.
- Shared feed/post/comment UI components used across home, profile, and post detail pages.
- User profile pages with user info and that user’s posts.
- Post detail pages with the post and its threaded comments.
- A shared notification system for info, warning, and error toasts.
- Reusable modal component.
- Shared star rating component with size variants.
- The create post page uses the larger star picker; feed/comment surfaces use the smaller shared variant.
- Admin pages for:
  - user management
  - post management
  - job automation
- Admin pages use MUI DataGrid for paginated table views and bulk actions.
- Admin automation queue for:
  - `CREATE_USER`
  - `CREATE_POST`
  - `CREATE_COMMENT`
  - `CREATE_LIKE`
- Admin job detail modal that shows job intent, progress, completion, failure, and created rows.

### UI conventions to preserve

- Use the shared `FeedTimeline`/`PostCard`/`CommentThread` stack for any new feed-like surface.
- Keep the home feed and profile feed visually aligned.
- Use the shared admin grid wrapper for any new admin table so vertical centering stays consistent.
- Prefer existing shared components before creating a new one.

## Main UI Surfaces

- `/` home feed
- `/login`
- `/create-account`
- `/create`
- `/profile`
- `/users/:userId`
- `/posts/:ratingId`
- `/admin/users`
- `/admin/posts`
- `/admin/jobs`

## Backend Surface

### Auth and users

- `AuthController` handles OTP send/login/logout.
- `AuthService` contains the login policy, including test-user bypass behavior.
- `UserController` exposes `/api/users/me`, user profile lookup, and user posts.
- `UserService` owns user creation, updates, delete behavior, and test-user queries.

### Feed and post actions

- `FeedController` exposes feed, rating detail, likes, comments, and re-rate.
- `FeedService` returns the feed read model.
- `FeedActionService` handles create rating, like/unlike, comment, and rerate.

### Admin

- `AdminUserController` manages users.
- `AdminPostController` manages posts.
- `AdminJobController` manages automation jobs.
- `AdminJobService` owns queueing, execution, persistence of job payload/results, and job detail rendering.
- `AdminJobProcessor` drains pending jobs.
- `AdminJobSchemaUpdater` keeps the job-type check constraint aligned with code.

## Data Model Notes

- `users.role` is the source of truth for admin/test-user behavior.
- `ROLE_ADMIN` is enforced in backend security.
- `ROLE_TEST_USER` is used only for synthetic test accounts.
- `admin_jobs` persists queue state with `PENDING`, `IN_PROGRESS`, `DONE`, and `FAILED`.
- Job payload/result JSON is stored in the database so details can be reconstructed later.

## Shared Frontend Components

Use these instead of recreating the same UI:

- `FeedTimeline`
- `PostCard`
- `CommentThread`
- `StarRating`
- `UserAvatar`
- `Modal`
- `Notification`
- `AdminDataGrid`

## Current Behavior Constraints

- User deletion is a hard delete and also removes their authored posts and the comments on those posts.
- Admin post deletion is a hard cleanup path and removes associated comments, likes, feed events, external reviews, the rating, the rateable item, and media asset rows.
- The home feed and profile feed should stay visually aligned by using the same backing list/card components.
- Any new admin table should use the shared admin grid wrapper so vertical alignment stays consistent.

## Where To Start When Continuing Work

1. Read [`docs/feed.md`](./feed.md) for the feed and post interaction contract.
2. Read [`docs/design_doc.md`](./design_doc.md) for the broader architecture and current roadmap.
3. Inspect the admin automation flow in `backend/src/main/java/com/rateit/backend/service/AdminJobService.java`.
4. Inspect the shared feed UI in `frontend/src/components/FeedTimeline.jsx` and `frontend/src/components/PostCard.jsx`.
5. Inspect the admin UI in `frontend/src/pages/AdminUsers.jsx`, `AdminPosts.jsx`, and `AdminJobs.jsx`.

## Important Workflow Rule

If you make a significant feature change, update the docs in this repo before finishing the task. See [`AGENTS.md`](../AGENTS.md) for the definition of “significant”.
