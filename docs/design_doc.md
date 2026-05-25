# System Design and Roadmap

This document describes the current application architecture and the remaining roadmap. It is intentionally written as a handoff doc so a new agent can pick up work without reconstructing the system from scratch.

## Current Architecture

### Frontend

- React + Vite
- React Router for page routing
- MUI used selectively on admin pages
- Custom components for feed, post, profile, comments, notifications, modal dialogs, and stars

### Backend

- Spring Boot
- JWT cookie authentication
- PostgreSQL via JPA/Hibernate
- MinIO/S3 for media upload storage
- Admin job queue stored in the database

### Security and roles

- `ROLE_ADMIN` gates admin APIs.
- `ROLE_TEST_USER` marks synthetic accounts created by automation.
- Role changes are persisted on `users.role`.
- The backend refreshes session state from current user data rather than trusting stale role state forever.

## Implemented Product Areas

### Authentication

- phone-based OTP login
- login verification bypass for test users
- logged-in user session via JWT cookie

### Social / content

- create rating
- feed of public ratings
- like / unlike
- re-rate
- threaded comments
- user profile pages
- post detail pages

### Admin

- user management
- post management
- automated user creation
- automated post creation
- automated comment creation
- automated like creation
- job detail inspection

## Data Model Summary

The important current tables and relationships are:

- `users`
- `ratings`
- `rating_comments`
- `rating_likes`
- `rateable_items`
- `rating_scales`
- `media_assets`
- `feed_events`
- `external_reviews`
- `admin_jobs`

The app currently relies on normalized tables rather than a precomputed feed table.

## Automation / Admin Jobs

The automation system is now queue-based and database-backed.

### Job states

- `PENDING`
- `IN_PROGRESS`
- `DONE`
- `FAILED`

### Job types

- `CREATE_USER`
- `CREATE_POST`
- `CREATE_COMMENT`
- `CREATE_LIKE`

### Current behavior

- jobs are created from the admin UI
- a background processor drains the queue
- job payload and result JSON are stored with the job row
- job detail pages reconstruct human-readable descriptions from the stored data

## Reuse Rules

The project already has shared UI components for the common content surfaces. Before adding a new component, check whether one of these already fits:

- `FeedTimeline`
- `PostCard`
- `CommentThread`
- `StarRating`
- `UserAvatar`
- `AdminDataGrid`
- `Modal`
- `Notification`

If the same structure is needed on two pages, prefer a shared component and pass data/props rather than duplicating markup.

## Roadmap

### Phase 1 complete

- auth
- feed
- posting
- profiles
- post detail
- admin moderation
- admin automation queue

### Likely next work

- extend automation with scenarios and template banks in the database
- make the admin automation UI less “dumb” and more configurable
- add richer moderation/search tools
- expand social graph behavior
- use the seeded synthetic data to test recommendation logic

### Lower-priority future work

- external integrations such as Yelp, Beli, and Letterboxd
- custom rating scales and richer scale management
- friend/follow ranking in the feed
- event-driven feed generation

## Notes for Future Changes

- Do not add a second feed rendering path unless there is a hard reason.
- Do not create page-specific copies of post/comment UI when a shared component exists.
- Treat admin deletes as separate from normal user actions.
- If the schema or API surface changes meaningfully, update the docs in the same change.
