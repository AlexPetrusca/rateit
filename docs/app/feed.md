# Feed and Post Flow

This document describes the current feed contract and the shared UI pattern used across the home feed, profile feed, and post detail page.

## What the feed shows

The authenticated home feed shows a reverse-chronological list of public ratings. Each item includes:

- author avatar and name
- timestamp
- star rating
- post body or media
- review text
- like count
- comment count
- like, rerate, and comment actions

The feed is paginated in batches of 5 and loads more when the user scrolls to the bottom. When the backend has no more content, the UI shows an end-of-feed message.

Deleted posts are excluded from feed and profile timelines. Direct post detail links can still render deleted posts as `This post has been deleted.` so their existing comment threads remain readable.

## Shared UI structure

The feed, profile feed, and post page should all use the same underlying post and comment components:

- `FeedTimeline` for list loading and pagination
- `PostCard` for the post shell and action row
- `CommentThread` for threaded comments
- `PostActions` for like, re-rate, and comment action controls
- `StarRating` for all star displays and pickers
- `UserAvatar` for avatars and fallback initials

This is the current rule for frontend work: reuse the shared components instead of building page-specific copies.

## Pages that use the feed model

- Home feed at `/`
- User profile feed at `/users/:userId`
- Post detail page at `/posts/:ratingId`

The home feed and profile feed should look the same. The only difference is the data source and which actions are wired to the page.

## Post detail page

Clicking a post opens the dedicated post page. That page shows:

- the selected post
- the comment tree for that rating
- threaded replies
- a deleted-post placeholder when the rating was removed by moderation

Post photos open in an in-place lightbox when clicked. This is handled by the shared `PostCard`, so feed, profile, and post detail images share the same larger-view behavior.

## Comment behavior

- Comments are threaded.
- Comments are also ratings, so they have a score and text.
- The thread view should keep the same author/avatar treatment used in the feed.

## Re-rate behavior

- Re-rating creates a new rating row for the same rateable item instead of updating or blocking an existing rating.
- A user can re-rate the same rateable item more than once.
- Existing databases that still have `uk_ratings_author_rateable_item` must drop that constraint; see `backend/src/main/resources/db/manual/2026-05-27-drop-rating-author-item-unique.sql`.

## Rating display rules

- Feed posts and post detail pages should use the same rating block.
- Image posts and text posts should not diverge in rating presentation.
- The current convention is to keep the review text indented beneath the star row for both post types.

## Backend endpoints

- `GET /api/feed?limit=N`
- `GET /api/feed/ratings/{ratingId}`
- `GET /api/feed/ratings/{ratingId}/like`
- `DELETE /api/feed/ratings/{ratingId}/like`
- `GET /api/feed/ratings/{ratingId}/comments`
- `POST /api/feed/ratings/{ratingId}/comments`
- `POST /api/feed/ratings/{ratingId}/rerate`

## Current feed notes

- The feed only includes public ratings and public rated items.
- The feed and profile lists exclude ratings with `deleted_at`, while post detail can still load them as tombstones.
- The home feed currently does not do social ranking.
- The profile feed is backed by the same timeline component as the home feed.
- New feed UI should fit the existing shared component model instead of introducing a second rendering path.
