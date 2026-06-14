# App Spec

This document covers the main user-facing product surface outside the admin area.

## Product Surface

- login via phone OTP
- create account
- create a post
- home feed
- user profiles
- post detail pages
- likes
- re-rates that create additional ratings for the same item
- threaded comments
- notifications

## Pages

- `/login`
- `/create-account`
- `/create`
- `/`
- `/profile`
- `/users/:userId`
- `/posts/:ratingId`

## Shared UI Components

Use the shared components below before creating new copies:

- `FeedTimeline`
- `PostCard`
- `PostActions`
- `CommentThread`
- `StarRating`
- `UserAvatar`
- `Modal`
- `Notification`

## Feed Rules

- The home feed and user profile feed should use the same backing component.
- The profile feed should look like the home feed unless there is a hard product reason to diverge.
- The feed should paginate and load more on scroll.
- The post detail page should reuse the same post and comment components instead of duplicating its own rendering path.

## Rating Rules

- Posts use the shared star component.
- The create page uses the larger picker.
- Feed, comment, and profile surfaces use the smaller picker.
- Image posts and text posts should share the same rating presentation.
- Review text should keep the same indented treatment across post types.
- Re-rating an item creates a new rating row and does not block users who have already rated that item.

## User Behavior Rules

- Clicking an avatar or username should navigate to the user profile.
- Clicking a post opens the post detail page.
- Comments are threaded.
- Comments remain ratings and include a score.

## Backend Areas That Support the App

- `AuthController`
- `AuthService`
- `UserController`
- `UserService`
- `FeedController`
- `FeedService`
- `FeedActionService`

## Implementation Map

If you are changing the main app surface, these are the first files to inspect:

- frontend routing: `frontend/src/App.jsx`
- logged-in state: `frontend/src/contexts/AuthContext.jsx`
- home feed: `frontend/src/pages/Home.jsx`
- profile page: `frontend/src/pages/Profile.jsx`
- post page: `frontend/src/pages/Post.jsx`
- create page: `frontend/src/pages/Create.jsx`
- shared feed rendering: `frontend/src/components/FeedTimeline.jsx`
- shared post rendering: `frontend/src/components/PostCard.jsx`
- shared comment rendering: `frontend/src/components/CommentThread.jsx`
- shared stars: `frontend/src/components/StarRating.jsx`
- backend feed and actions: `backend/src/main/java/com/rateit/backend/controller/FeedController.java`
- backend feed queries: `backend/src/main/java/com/rateit/backend/service/FeedService.java`
- backend post actions: `backend/src/main/java/com/rateit/backend/service/FeedActionService.java`
- user profiles: `backend/src/main/java/com/rateit/backend/controller/UserController.java`
- auth flow: `backend/src/main/java/com/rateit/backend/controller/AuthController.java` and `backend/src/main/java/com/rateit/backend/service/AuthService.java`

### API surface used by the app

- `GET /api/feed?limit=N`
- `GET /api/feed/ratings/{ratingId}`
- `GET /api/feed/ratings/{ratingId}/comments`
- `POST /api/feed/ratings/{ratingId}/comments`
- `POST /api/feed/ratings/{ratingId}/like`
- `DELETE /api/feed/ratings/{ratingId}/like`
- `POST /api/feed/ratings/{ratingId}/rerate`
- `GET /api/users/me`
- `GET /api/users/{userId}`
- `GET /api/users/{userId}/posts`

## Current Invariants

- Public feed content only includes public ratings and public rated items.
- UI should use existing shared components before inventing a new variation.
- The feed, profile, and post detail views should stay visually consistent.
