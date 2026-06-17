# Feed and Post Flow

This document describes the current feed contract and the shared UI pattern used across the home feed, profile feed, and topic page.

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

Deleted posts are excluded from feed and profile timelines. On the topic page, deleted ratings stay as tombstones only when they still have comments; otherwise they are removed entirely.

## Shared UI structure

The feed, profile feed, and topic page should all use the same underlying post and comment components:

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
- Topic page at `/topics/:rateableItemId`
- Post editor at `/posts/:ratingId/edit`

The home feed and profile feed should look the same. The only difference is the data source and which actions are wired to the page.

## Topic page

Clicking the topic text on a post opens a topic page for that shared rateable item. That page shows:

- every public rating on the same topic
- the same post card shell and actions used by the main feed
- the same comments interactions as the home feed
- a raised topic summary card showing the topic name, average stars, and rating count
- ratings on the topic page are shown oldest-to-newest so the newest rating appears at the bottom

The topic page is the linked-post view for a shared topic, so the same item can be explored across all of its ratings.

The topic page now keeps the discussion controls compact: each rating row exposes like, comment, and edit actions, while a single composer at the bottom lets the user add another rating to the topic with a score and description.

When the shared topic has an attached photo, the image is shown in the raised topic summary card and the individual ratings underneath suppress the repeated photo so the list stays focused on the reviews.

On feed cards, clicking the attached photo now opens the shared topic page instead of only expanding the image in place.

The topic summary star row uses the raw average score, so partial averages are shown precisely instead of being rounded to the nearest half star in the display.

## Comment behavior

- Comments are threaded.
- Comments are also ratings, so they have a score and text.
- On the topic page, nested replies stay collapsed by default and, when expanded, render inside the parent comment card with just a thin divider between the parent and the reply branch.
- Opening a nested reply keeps its parent chain visible so the active branch stays readable.
- The thread view should keep the same author/avatar treatment used in the feed.

## Re-rate behavior

- Re-rating creates a new rating row for the same rateable item instead of updating or blocking an existing rating.
- A user can re-rate the same rateable item more than once.
- Existing databases that still have `uk_ratings_author_rateable_item` must drop that constraint; see `backend/src/main/resources/db/manual/2026-05-27-drop-rating-author-item-unique.sql`.

## Rating display rules

- Feed posts, topic pages, and any remaining detail-like surfaces should use the same rating block.
- Image posts and text posts should not diverge in rating presentation.
- The current convention is to keep the review text indented beneath the star row for both post types.
- Read-only star displays should reflect the exact stored average or score, while the interactive picker can still snap to the supported step size.

## Backend endpoints

- `GET /api/feed?limit=N`
- `GET /api/feed/ratings/{ratingId}`
- `GET /api/feed/topics/{rateableItemId}`
- `GET /api/topics/{rateableItemId}`
- `PUT /api/feed/ratings/{ratingId}`
- `DELETE /api/feed/ratings/{ratingId}`
- `GET /api/feed/ratings/{ratingId}/like`
- `DELETE /api/feed/ratings/{ratingId}/like`
- `GET /api/feed/ratings/{ratingId}/comments`
- `POST /api/feed/ratings/{ratingId}/comments`
- `POST /api/feed/ratings/{ratingId}/rerate`

## Current feed notes

- The feed only includes public ratings and public rated items.
- The feed and profile lists exclude ratings with `deleted_at`; the topic page can still show tombstones when a deleted rating has comments.
- Own posts can surface an edit action that routes to the dedicated post editor page.
- The home feed currently does not do social ranking.
- The profile feed is backed by the same timeline component as the home feed.
- New feed UI should fit the existing shared component model instead of introducing a second rendering path.
