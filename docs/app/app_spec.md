# App Spec

This document covers the main user-facing product surface outside the admin area.

## Product Surface

The web app lives in `frontend/`. The native mobile app lives in `mobile/` and mirrors the same core product surface with React Native screens and reusable native components.

The top bar is intentionally minimal: a hamburger menu opens Home, Backlog, Install, and Login for signed-out users, and Home, Backlog, Install, and Admin for signed-in admins, while the signed-in right side keeps only Create and the profile avatar.
The login route is its own full-screen brand treatment and does not render the top bar.

- login via phone OTP
- create account
- create a post
- home feed
- user profiles
- likes
- re-rates that create additional ratings for the same item
- threaded comments
- user search
- followers/following

## Pages

- `/login`
- `/create`
- `/`
- `/profile`
- `/profile/edit`
- `/users/:userId`
- `/topics/:rateableItemId`
- `/posts/:ratingId/edit`
- `/backlog`
- `/install`
- `/backlog/suggest`
- `/search`
- `/users/:userId/followers`
- `/users/:userId/following`

## Shared UI Components

Use the shared components below before creating new copies:

- `FeedTimeline`
- `PostCard`
- `PostActions`
- `CommentThread`
- `CommentComposer`
- `RatingComposer`
- `StarRating`
- `UserAvatar`
- `Modal`
- `Notification`

## Feed Rules

- The home feed and user profile feed should use the same backing component.
- The profile feed should look like the home feed unless there is a hard product reason to diverge.
- The feed should paginate and load more on scroll.
- Clicking a post should route directly to the shared topic page for that rated item.

## Mobile Layout

- The React Native app targets iOS, Android, and mobile web. Native builds use platform-native bottom tabs for Home, Following, Create, Search, and Profile, while web uses JavaScript bottom tabs; detail screens retain stack navigation.
- Full-screen native detail routes expose their stack header on web so browser users always have a visible back action.
- Local mobile-web development may use any localhost port while sending credentialed API requests to the local backend.
- On iOS 26 builds compiled with Xcode 26 or newer, the system tab bar adopts Liquid Glass automatically; Android uses its native bottom navigation view and interaction treatment.
- The mobile visual system keeps Critic's near-black and red identity while using platform-sized controls, 44pt minimum action targets, safe-area-aware scrolling, and compact gutters below 375px.
- Native screens should preserve the same functional contracts as the web pages even when the layout differs.
- Secondary destinations remain in the profile settings menu so the native tab bar stays at five items.
- Feed cards reduce avatar and gutter sizes, use responsive media ratios and short dates, and allow action controls to wrap without creating horizontal overflow.
- Mobile image topics use three full-screen layers: a cover image, fixed topic metadata, and an edge-to-edge review list; scrolling reviews applies native blur above the image and metadata without blurring the cards.
- Search forms, profile headers, and composer actions stack vertically when their desktop layout no longer fits.

## Rating Rules

- Posts use the shared star component.
- The create page uses the larger picker.
- New ratings accept half-star steps from `0.5` to `5`.
- Feed, comment, and profile surfaces use the smaller picker.
- On mobile, the interactive star picker supports sliding your finger across the control to set the score.
- The mobile star picker is one native adjustable control with tap, drag, and VoiceOver/TalkBack half-step input.
- Image posts and text posts should share the same rating presentation.
- Review text should keep the same indented treatment across post types.
- Re-rating an item creates a new rating row and does not block users who have already rated that item.

## User Behavior Rules

- Unauthenticated users who land on `/` are sent directly to `/login` rather than seeing a guest home placeholder.
- The login page uses a full-screen DM Sans `EVERYONES A CRITIC` background text treatment with the phone-number entry layered above it; the phone field has a clickable flag that opens a searchable country-code menu, completing a valid 10-digit number sends the OTP without a visible Send Code button, the verification-code field replaces the phone field in place, and verified users who still need a profile see an inline username and profile-picture setup form on the same page after the app has a brief chance to resolve the current session before entering the app.
- `/create-account` now redirects into `/login` instead of acting as a standalone page.
- Clicking an avatar or username should navigate to the user profile.
- Clicking a post opens the shared topic page for that rated item.
- User profiles expose only public-safe profile information: avatar, username, handle, and visible posts.
- The profile editor starts as a focused page for updating the signed-in user's profile picture, including square crop/size controls before upload.
- The post editor lets the signed-in author update the topic text, review text, and rating score, and it conditionally tombstones the post only when comment threads still need to stay intact.
- The backlog page renders the `To Do` section from `wiki/build-status.md` as a readable in-app project board.
- The install page explains how to add Critic to an iPhone home screen.
- The backlog page includes a suggestion entry point and a suggestions table below the backlog sections.
- The suggestion submit page lets signed-in users send new ideas into the shared suggestions list.
- Clicking the topic text on a post opens a topic page that shows every rating on that shared topic.
- The topic page shows a compact list of rating cards; clicking a rating card or its comment action expands that card inline and loads its comments.
- Expanded topic rating cards use the shared `CommentThread` and `CommentComposer` path for comments and replies.
- The comment icon on rating cards toggles the thread open or closed, and the adjacent arrow icon opens the reply composer for that rating.
- Home, profile, and topic pages now render the same expanded comment-card layout instead of separate page-specific thread blocks.
- The topic page keeps like/comment/edit controls on each rating row, and comment rows themselves now expose the same like/comment/edit action set.
- The topic page exposes one bottom composer for adding another rating to the topic.
- Topic metadata comes from a stable topic lookup, so the topic page can still render the shared item even if a rating row is deleted.
- Topics without media now use the same fixed hero layout as photo-backed topics, but with a black background instead of image artwork so the title and rating summary stay in the same spot.
- The no-photo topic hero also follows the same scroll-driven blur behavior, using a blurred red-tinted gradient background when there is no image.
- Entering a topic page resets the scroll position to the top so the fixed hero always starts unblurred and only fades once the user scrolls.
- User profiles expose the current viewer's follow relation to that profile user, plus follower/following counts.
- Follower and following counts are clickable and open public-safe list pages.
- User search is public-safe and supports finding people by username so users can follow them.
- Comments are threaded.
- Comments remain ratings and include a score.
- Production OTP delivery uses Twilio; localhost Kubernetes traffic routes API/auth requests to a separate mocker-profile backend for verification-code testing.

## Backend Areas That Support the App

- `AuthController`
- `AuthService`
- `UserController`
- `UserService`
- `FollowController`
- `FollowService`
- `FeedController`
- `FeedService`
- `FeedActionService`
- `SuggestionController`
- `SuggestionService`

## Implementation Map

If you are changing the main app surface, these are the first files to inspect:

- frontend routing: `frontend/src/App.jsx`
- mobile routing: `mobile/src/navigation/AppNavigator.jsx`
- mobile shared components: `mobile/src/components/`
- logged-in state: `frontend/src/contexts/AuthContext.jsx`
- home feed: `frontend/src/pages/Home.jsx`
- profile page: `frontend/src/pages/Profile.jsx`
- user search page: `frontend/src/pages/SearchUsers.jsx`
- follower/following list page: `frontend/src/pages/FollowList.jsx`
- create page: `frontend/src/pages/Create.jsx`
- shared feed rendering: `frontend/src/components/FeedTimeline.jsx`
- shared post rendering: `frontend/src/components/PostCard.jsx`
- shared comment rendering: `frontend/src/components/CommentThread.jsx`
- shared comment composer: `frontend/src/components/CommentComposer.jsx`
- shared rating/re-rate composer: `frontend/src/components/RatingComposer.jsx`
- shared stars: `frontend/src/components/StarRating.jsx`
- backend feed and actions: `backend/src/main/java/com/rateit/backend/controller/FeedController.java`
- backend feed queries: `backend/src/main/java/com/rateit/backend/service/FeedService.java`
- backend post actions: `backend/src/main/java/com/rateit/backend/service/FeedActionService.java`
- user profiles: `backend/src/main/java/com/rateit/backend/controller/UserController.java`
- auth flow: `backend/src/main/java/com/rateit/backend/controller/AuthController.java` and `backend/src/main/java/com/rateit/backend/service/AuthService.java`

### API surface used by the app

- `GET /api/feed?limit=N`
- `GET /api/feed/ratings/{ratingId}`
- `GET /api/topics/{rateableItemId}`
- `PUT /api/feed/ratings/{ratingId}`
- `DELETE /api/feed/ratings/{ratingId}`
- `GET /api/feed/ratings/{ratingId}/comments`
- `POST /api/feed/ratings/{ratingId}/comments`
- `POST /api/feed/ratings/{ratingId}/like`
- `DELETE /api/feed/ratings/{ratingId}/like`
- `POST /api/feed/ratings/{ratingId}/rerate`
- `GET /api/s3/images/url/{key}` for mobile-friendly authenticated image URL resolution
- `GET /api/users/me`
- `PUT /api/users/me`
- `GET /api/users/search?query={query}&limit={limit}`
- `GET /api/users/{userId}`
- `GET /api/users/{userId}/posts`
- `GET /api/users/{userId}/followers`
- `GET /api/users/{userId}/following`
- `POST /api/follows/{userId}`
- `DELETE /api/follows/{userId}`

## Current Invariants

- Public feed content only includes public ratings and public rated items.
- UI should use existing shared components before inventing a new variation.
- The feed, profile, and topic views should stay visually consistent.
