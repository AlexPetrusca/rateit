# Feed Design

## Functional Design

The first feed iteration shows authenticated users a reverse-chronological list of recent public ratings. Each feed item answers four questions:

- Who made the rating?
- What did they rate?
- What score did they give it?
- What did they say about it?

The Home page is now the feed surface. When a signed-in user lands there, the frontend loads recent ratings from the backend and renders each rating with the author's username/avatar, timestamp, score, rated item title/body, optional media, and review text.

This first pass is intentionally global. It does not yet rank by friendship, follows, favorites, or recency windows beyond newest-first ordering. The backend only returns ratings where both the rating and the rated item are `PUBLIC`, which keeps private and friends-only data out of the initial feed.

## Current User Story

Bob Bananas has seed ratings in the local database so the feed has real content during development. His seed data includes a default five-star rating scale, a few text/photo rateable items, and ratings attached to those items.

## Backend Design

`GET /api/feed?limit=20` returns a list of feed rating DTOs.

The request path is implemented by:

- `FeedController`: exposes the `/api/feed` endpoint.
- `FeedService`: normalizes the limit and maps ratings into DTOs.
- `RatingRepository`: fetches recent public ratings with the author, rateable item, rating scale, and optional media asset loaded in one query.
- `FeedItemDto`: shapes the response for the frontend.

The response shape is:

```json
[
  {
    "ratingId": 1,
    "score": 4.5,
    "reviewText": "A classic.",
    "createdAt": "2026-05-23T12:00:00Z",
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

`feed_events` exists in the schema for a future event-driven feed model, but this iteration does not query it yet.

## Frontend Design

`BackendApiService.getFeed()` calls `/api/feed`. `Home.jsx` loads feed data once a full authenticated profile exists and renders loading, error, empty, and populated states.

The visual treatment is a straightforward activity feed: a constrained center column, repeated feed cards, compact author rows, an emphasized score badge, and optional media. This keeps the first version easy to scan and leaves room for future actions like comments, reactions, or rate-this-too controls.

## Next Iterations

- Add create-rating flows so seed data is not needed for local content.
- Include friendship/follow filtering and ranking.
- Decide whether `feed_events` should become the main read source for richer activity types.
- Add pagination or cursor-based loading.
- Add tests for repository filtering, DTO mapping, and frontend loading/error states.
