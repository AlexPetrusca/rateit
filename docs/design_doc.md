# RateIt Design Doc

## Overview

RateIt is an app where anyone can rate anything. to start, we have accounts, and the ability to post a photo, and then rate that photo with a 1-5 stars and a text review. that is the base idea. users can have friends, and a log of all their reviews. there needs to be a "feed" like twitted to scroll and see all your friends ratings. there also needs to be a way to rate things that someone else rated. you need to also be able to rate other peoples ratings.

from there, we need the ability to make a "post" and then rate that post, essentially the same as just a photo, but the content being rated is just text. after that, I'd like the ability to make different scales for rating things, 1-5 stars, or 1-10 (any emoji), or -5 to 5 stars, can be customized by the user. finally, id like to enhance the platform with integrations with yelp, belli, letterbox, and connect accounts to all of those other accounts and post reviews from other accounts on a users page.

## Database Design

This section describes the current relational database model. The backend now has JPA entities and repositories for the core schema: users, media assets, rateable items, rating scales, ratings, friendships, follows, feed events, and external review integrations.

Important current-state note: most of these tables exist as schema only. The app currently exposes user/auth/profile/image-upload flows, but it does not yet expose product endpoints for creating rateable items, ratings, friendships, follows, feed events, custom scales, or external imports.

### Design Principles

- Prefer a small number of general-purpose tables that can support many kinds of rateable content.
- Treat anything a user can rate as a `rateable_item`.
- Treat every review/rating as its own durable object so ratings can be shown in feeds, commented on later, or rated by other users.
- Keep uploaded media metadata in Postgres, but store the actual image files in MinIO/S3.
- Use join tables for social relationships and many-to-many associations.
- Store external imported reviews separately enough that we can preserve source metadata.

### Current Tables

#### `users`

Stores the core account/profile record for a person using RateIt.

Current backend entity: `User`.
Current repository: `UserRepository`.

Columns:

- `id`: primary key.
- `created_at`: timestamp set when the row is created.
- `updated_at`: timestamp set when the row is updated.
- `username`: unique public handle/display name.
- `phone_number`: unique login identifier.
- `profile_pic_url`: object key or URL for the user's profile photo.

Constraints and indexes:

- Primary key on `id`.
- Unique index on `phone_number`.
- Unique index on `username`.
- `phone_number` and `username` should be non-null.

### Core Tables

#### `media_assets`

Stores metadata for uploaded files, mostly photos at first.

Columns:

- `id`: primary key.
- `created_at`
- `updated_at`
- `owner_user_id`: foreign key to `users.id`.
- `bucket`: MinIO/S3 bucket name, for example `images`.
- `object_key`: object key, for example `uploads/123_photo.jpg`.
- `content_type`: MIME type, for example `image/jpeg`.
- `size_bytes`: optional file size.
- `width`: optional image width.
- `height`: optional image height.

Notes:

- This keeps the database from depending directly on raw URL strings.
- Public display URLs can still be generated through the backend using presigned URLs or nginx proxy routes.
- Current backend entity: `MediaAsset`.
- Current repository: `MediaAssetRepository`.

#### `rateable_items`

Represents anything that can be rated: a photo, a text post, a restaurant import, a movie import, or even another user's rating.

Columns:

- `id`: primary key.
- `created_at`
- `updated_at`
- `created_by_user_id`: foreign key to `users.id`.
- `item_type`: enum/string such as `PHOTO`, `TEXT_POST`, `EXTERNAL_REVIEW`, `RATING`.
- `title`: optional short title.
- `body`: optional text content for posts.
- `media_asset_id`: nullable foreign key to `media_assets.id`.
- `source_integration_id`: nullable foreign key to `external_integrations.id`.
- `source_external_id`: nullable ID from Yelp, Beli, Letterboxd, etc.
- `visibility`: enum/string such as `PUBLIC`, `FRIENDS`, `PRIVATE`.

Notes:

- A photo rating target is a `rateable_items` row with `item_type = PHOTO` and a `media_asset_id`.
- A text post is a `rateable_items` row with `item_type = TEXT_POST` and `body`.
- A rating can itself become rateable by creating a `rateable_items` row with `item_type = RATING`.
- Current backend entity: `RateableItem`.
- Current repository: `RateableItemRepository`.
- Current enum dependencies: `RateableItemType`, `Visibility`.

#### `rating_scales`

Defines how a rating is measured.

Columns:

- `id`: primary key.
- `created_at`
- `updated_at`
- `owner_user_id`: nullable foreign key to `users.id`.
- `name`: display name, for example `5 stars`.
- `scale_type`: enum/string such as `NUMERIC`, `STARS`, `EMOJI`.
- `min_value`: minimum numeric value.
- `max_value`: maximum numeric value.
- `step`: allowed increment, for example `1` or `0.5`.
- `symbol`: optional display symbol, for example `star` or an emoji.
- `is_default`: boolean.

Examples:

- `1` to `5`, symbol `star`.
- `1` to `10`, symbol `fire`.
- `-5` to `5`, symbol `star`.

Current backend entity: `RatingScale`.
Current repository: `RatingScaleRepository`.
Current enum dependency: `RatingScaleType`.

#### `ratings`

Stores a user's rating/review of a rateable item.

Columns:

- `id`: primary key.
- `created_at`
- `updated_at`
- `author_user_id`: foreign key to `users.id`.
- `rateable_item_id`: foreign key to `rateable_items.id`.
- `rating_scale_id`: foreign key to `rating_scales.id`.
- `score`: numeric score.
- `review_text`: optional written review.
- `visibility`: enum/string such as `PUBLIC`, `FRIENDS`, `PRIVATE`.

Constraints and indexes:

- Index on `rateable_item_id`.
- Index on `author_user_id`.
- Unique constraint on `(author_user_id, rateable_item_id)`, so each user can rate a specific item once.
- Check constraint that `score` is within the scale range if enforced at the database layer.

Notes:

- This is the main feed unit: a friend rated something.
- If users can rate other people's ratings, create a `rateable_items` row for a `ratings.id`, then store the second-level rating here too.
- Current backend entity: `Rating`.
- Current repository: `RatingRepository`.
- Current enum dependency: `Visibility`.

### Social Tables

#### `friendships`

Stores user-to-user friend relationships.

Columns:

- `id`: primary key.
- `created_at`
- `updated_at`
- `requester_user_id`: foreign key to `users.id`.
- `addressee_user_id`: foreign key to `users.id`.
- `status`: enum/string such as `PENDING`, `ACCEPTED`, `BLOCKED`.

Constraints and indexes:

- Unique constraint on `(requester_user_id, addressee_user_id)`.
- Index on `requester_user_id`.
- Index on `addressee_user_id`.

Notes:

- Feed queries can use accepted friendships to determine which ratings to show.
- Current backend entity: `Friendship`.
- Current repository: `FriendshipRepository`.
- Current enum dependency: `FriendshipStatus`.

#### `follows`

Optional alternative to friendships if the product wants asymmetric following.

Columns:

- `id`: primary key.
- `created_at`
- `follower_user_id`: foreign key to `users.id`.
- `followed_user_id`: foreign key to `users.id`.

Constraints:

- Unique constraint on `(follower_user_id, followed_user_id)`.

Notes:

- Current backend entity: `Follow`.
- Current repository: `FollowRepository`.

### Feed Tables

The feed can initially be computed from `ratings`, `rateable_items`, and `friendships`. A separate feed table is only needed if performance or ranking becomes complicated.

#### `feed_events`

Optional denormalized table for faster feed loading.

Columns:

- `id`: primary key.
- `created_at`
- `actor_user_id`: foreign key to `users.id`.
- `event_type`: enum/string such as `CREATED_RATING`, `CREATED_ITEM`, `FRIEND_JOINED`.
- `rating_id`: nullable foreign key to `ratings.id`.
- `rateable_item_id`: nullable foreign key to `rateable_items.id`.

Notes:

- This table should be considered a cache of activity, not the source of truth.
- Current backend entity: `FeedEvent`.
- Current repository: `FeedEventRepository`.
- Current enum dependency: `FeedEventType`.

### External Integration Tables

#### `external_integrations`

Represents a connected third-party platform.

Columns:

- `id`: primary key.
- `created_at`
- `updated_at`
- `provider`: enum/string such as `YELP`, `BELI`, `LETTERBOXD`.
- `display_name`: human-readable provider name.

Constraints:

- Unique constraint on `provider`.

Notes:

- Current backend entity: `ExternalIntegration`.
- Current repository: `ExternalIntegrationRepository`.
- Current enum dependency: `ExternalProvider`.

#### `user_external_accounts`

Links a RateIt user to an account on another platform.

Columns:

- `id`: primary key.
- `created_at`
- `updated_at`
- `user_id`: foreign key to `users.id`.
- `external_integration_id`: foreign key to `external_integrations.id`.
- `external_user_id`: provider's user/account ID.
- `external_username`: provider username or display handle.
- `access_token_ref`: reference to an encrypted token or secret storage entry.
- `refresh_token_ref`: reference to an encrypted token or secret storage entry.
- `last_synced_at`: timestamp of last successful import.

Constraints:

- Unique constraint on `(external_integration_id, external_user_id)`.
- Unique constraint on `(user_id, external_integration_id)`, so each user can connect one account per provider.

Notes:

- Current backend entity: `UserExternalAccount`.
- Current repository: `UserExternalAccountRepository`.

#### `external_reviews`

Stores imported review metadata before or alongside conversion into RateIt items/ratings.

Columns:

- `id`: primary key.
- `created_at`
- `updated_at`
- `user_external_account_id`: foreign key to `user_external_accounts.id`.
- `external_review_id`: review ID from the provider.
- `title`: imported title.
- `body`: imported review text.
- `score`: imported score.
- `source_url`: URL to the original review.
- `reviewed_at`: timestamp from the provider.
- `rateable_item_id`: nullable foreign key to `rateable_items.id`.
- `rating_id`: nullable foreign key to `ratings.id`.

Constraints:

- Unique constraint on `(user_external_account_id, external_review_id)`.

Notes:

- Current backend entity: `ExternalReview`.
- Current repository: `ExternalReviewRepository`.

### Current Backend Support

The backend currently contains:

- JPA entities for every table listed above.
- Spring Data repositories for every table listed above.
- Existing API support for users, auth, and S3 image URL generation.

The backend does not yet contain:

- Controllers or services for creating media asset records.
- Controllers or services for creating rateable items.
- Controllers or services for submitting ratings.
- Friend/follow request endpoints.
- Feed generation endpoints.
- External integration connection or import jobs.

### Suggested MVP Schema Order

1. Add services/controllers for `media_assets`, `rateable_items`, and `ratings`.
2. Seed a default `rating_scales` row for 1-5 stars.
3. Wire profile photo uploads to `media_assets` instead of storing only the raw object key on `users`.
4. Add photo post creation.
5. Add rating submission for photo posts.
6. Add friendships.
7. Build the feed from ratings and friendships before relying heavily on `feed_events`.
8. Add custom rating scales.
9. Add external integrations/imports.
