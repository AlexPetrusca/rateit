# Admin Spec

This document covers the manual admin surfaces.

## Admin Pages

- `/admin/users`
- `/admin/posts`
- `/admin/comments`
- `/admin/jobs`

The main admin entry point should land on the user management page, with a top-level admin nav that clearly indicates the admin context.

## Shared Admin UI Components

- `AdminDataGrid`
- `Modal`
- `Notification`

Use the shared admin grid wrapper for every table-like admin screen so alignment and selection behavior stay consistent.

## User Management

The users page supports:

- paginated user listing
- edit user fields
- delete users
- delete all test users
- bulk actions on selected users

Deletion is a hard delete flow in the current admin implementation.

## Post Management

The posts page supports:

- paginated post listing
- edit post fields
- remove posts
- bulk actions on selected posts

Admin post removal is a soft-delete/tombstone path. It marks the rating as deleted, removes likes/feed/external references, and preserves comments so existing threads can still render below a deleted-post placeholder.

## Backend Surface

- `AdminUserController`
- `AdminPostController`
- `AdminCommentController`

## Implementation Map

If you are changing the manual admin pages, these are the first files to inspect:

- admin shell and routing: `frontend/src/pages/Admin.jsx`
- user management page: `frontend/src/pages/AdminUsers.jsx`
- post management page: `frontend/src/pages/AdminPosts.jsx`
- comment management page: `frontend/src/pages/AdminComments.jsx`
- shared admin grid wrapper: `frontend/src/components/AdminDataGrid.jsx`
- shared modal wrapper: `frontend/src/components/Modal.jsx`
- top nav admin entry: `frontend/src/components/TopBar.jsx`
- admin users backend: `backend/src/main/java/com/rateit/backend/controller/AdminUserController.java`
- admin posts backend: `backend/src/main/java/com/rateit/backend/controller/AdminPostController.java`
- admin comments backend: `backend/src/main/java/com/rateit/backend/controller/AdminCommentController.java`
- admin user service: `backend/src/main/java/com/rateit/backend/service/UserService.java`
- admin post service: `backend/src/main/java/com/rateit/backend/service/AdminPostService.java`
- admin comment service: `backend/src/main/java/com/rateit/backend/service/AdminCommentService.java`

### API surface used by the manual admin pages

- `GET /api/admin/users`
- `PUT /api/admin/users/{id}`
- `DELETE /api/admin/users/{id}`
- `POST /api/admin/users/bulk-delete`
- `DELETE /api/admin/users/test-users`
- `GET /api/admin/posts`
- `PUT /api/admin/posts/{id}`
- `DELETE /api/admin/posts/{id}`
- `POST /api/admin/posts/bulk-delete`
- `GET /api/admin/comments`
- `PUT /api/admin/comments/{id}`
- `DELETE /api/admin/comments/{id}`
- `POST /api/admin/comments/bulk-delete`

## Current Invariants

- Admin APIs are protected by `ROLE_ADMIN`.
- Admin deletes are separate from normal user actions.
- Any new admin table should use the shared admin grid wrapper.
