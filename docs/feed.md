# Feed Design

## Functional Design

The feed shows authenticated users a reverse-chronological list of recent public ratings. Each feed item answers four questions:

- Who made the rating?
- What did they rate?
- What score did they give it?
- What did they say about it?

The Home page is now the feed surface. When a signed-in user lands there, the frontend loads recent ratings from the backend and renders each rating with the author's username/avatar, timestamp, score, rated item title/body, optional media, and review text.

The visual model is Twitter-inspired functional design: a single center timeline, border-separated posts, avatar and handle metadata, and compact actions underneath the content. This is not intended to copy Twitter branding; it uses the familiar timeline pattern to make the RateIt actions easy to understand.

Text-only and image-backed ratings intentionally render differently. Text-only ratings behave like text posts: the item body is the primary content, no item title is shown, and the score appears as compact inline metadata. Image ratings behave like media posts: the image is presented as the attached object, the title can label that object, and the original poster's rating sits inside the media card.

Each rating post supports three primary actions:

- Like: adds or removes the current user's like on the rating.
- Re-rate: starts a composer for the current user to rate the same underlying item.
- Comment: opens a threaded reply composer tied to the rating. In RateIt, comments are also ratings, so each reply includes both text and a score on the same scale as the original post.

This pass is intentionally global. It does not yet rank by friendship, follows, favorites, or recency windows beyond newest-first ordering. The backend only returns ratings where both the rating and the rated item are `PUBLIC`, which keeps private and friends-only data out of the initial feed.

## Current User Story

Bob Bananas has seed ratings in the local database so the feed has real content during development. His seed data includes a default five-star rating scale, a few text/photo rateable items, and ratings attached to those items.

## Backend Design

`GET /api/feed?limit=20` returns a list of feed rating DTOs.

The request path is implemented by:

- `FeedController`: exposes the `/api/feed` endpoint.
- `FeedService`: normalizes the limit and maps ratings into DTOs.
- `FeedActionService`: handles likes, comments, and re-rates.
- `RatingRepository`: fetches recent public ratings with the author, rateable item, rating scale, and optional media asset loaded in one query.
- `RatingLikeRepository`: stores one like per user/rating pair.
- `RatingCommentRepository`: stores comments for each rating.
- `FeedItemDto` and `RatingCommentDto`: shape responses for the frontend.

Action endpoints:

- `POST /api/feed/ratings/{ratingId}/like`
- `DELETE /api/feed/ratings/{ratingId}/like`
- `GET /api/feed/ratings/{ratingId}/comments`
- `POST /api/feed/ratings/{ratingId}/comments`
- `POST /api/feed/ratings/{ratingId}/rerate`

Re-rate creates a new row in `ratings` for the same `rateable_item`. Because the current schema enforces one rating per author per item, the backend returns `409 Conflict` if the user has already rated that item.

The response shape is:

```json
[
  {
    "ratingId": 1,
    "score": 4.5,
    "reviewText": "A classic.",
    "createdAt": "2026-05-23T12:00:00Z",
    "likeCount": 2,
    "commentCount": 1,
    "likedByCurrentUser": true,
    "author": {
      "username": "bob_bananas",
      "profilePicUrl": "uploads/example.jpg"
    },
    "rateableItem": {
      "id": 1,
      "type": "PHOTO",
      "title": "Minion field test",
      "body": "Testing the first RateIt photo post.",
      "mediaObjectKey": "uploads/example.jpg"
    },
    "ratingScale": {
      "name": "5 stars",
      "symbol": "star",
      "min": 1,
      "max": 5
    }
  }
]
```

## Database Design

The feed currently reads from normalized content/rating tables rather than a denormalized feed table.

- `ratings`: primary feed source, with score, review text, visibility, author, item, and rating scale.
- `rateable_items`: the rated object, including item type, title, body, optional media, and visibility.
- `media_assets`: optional image backing a rateable item.
- `rating_scales`: describes the scale used for the score.
- `users`: supplies author identity and avatar.
- `rating_likes`: stores likes against ratings with a unique rating/user constraint.
- `rating_comments`: stores threaded comments against ratings. Each comment carries text and a score, because comments are also ratings in the product model.

`feed_events` exists in the schema for a future event-driven feed model, but this iteration does not query it yet.

## Frontend Design

`BackendApiService.getFeed()` calls `/api/feed`. `Home.jsx` loads feed data once a full authenticated profile exists and renders loading, error, empty, and populated states.

The visual treatment is a Twitter-like activity feed: a constrained center timeline, post rows with avatars, media-aware post bodies, and action controls for like, re-rate, and comment. Image posts use a rounded rateable-object preview with a title and OP rating strip. Text posts skip titles and previews, showing body text first with a smaller OP rating line. Like is optimistic in the UI and rolls back on API failure. Comment and re-rate open inline composers under the target post. The comment composer asks for a rating and text together, and existing comments display their rating beside the commenter identity.

## Next Iterations

- Add create-rating flows so seed data is not needed for local content.
- Include friendship/follow filtering and ranking.
- Decide whether `feed_events` should become the main read source for richer activity types.
- Add pagination or cursor-based loading.
- Add richer comment thread sorting and aggregation around comment ratings.
- Add durable migration files instead of relying on Hibernate `ddl-auto=update`.
- Add tests for repository filtering, DTO mapping, and frontend loading/error states.
