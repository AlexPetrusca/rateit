# Critic

Critic is a social app for ratings and reviews with threaded comments, a feed, user profiles, post detail pages, and an admin automation console.

## Current Features

- phone OTP authentication
- admin and test-user roles
- infinite-scroll feed
- rating creation and re-rating
- likes
- threaded comments
- user profile pages
- post detail pages
- admin user management
- admin post management
- admin job automation for users, posts, comments, and likes
- shared React components for feed, posts, comments, stars, avatars, modals, notifications, and admin grids

## Docs

Start here if you are continuing the codebase:

- [`docs/agent_handoff.md`](docs/agent_handoff.md)
- [`docs/app/app_spec.md`](docs/app/app_spec.md)
- [`docs/app/feed.md`](docs/app/feed.md)
- [`docs/admin/admin_spec.md`](docs/admin/admin_spec.md)
- [`docs/admin/automation.md`](docs/admin/automation.md)

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd critic

# Start with Docker Compose (recommended)
docker-compose up -d

# Or run locally with backend auto-refresh
cd backend && ./scripts/dev.sh
cd ../frontend && npm install && npm run dev
```

## Deployment

Push to Docker Hub:
```bash
./push.sh [--dev|--prod]
```

Deploy to Kubernetes:
```bash
./deploy.sh
```

`deploy.sh` publishes the current backend image first, then rolls the Kubernetes release and uploads the frontend bundle.

Fast local deploy:
```bash
./deploy.sh --local
```

Local deploy skips the backend image push by default, keeps `app.critic-app.com` on the Twilio backend, and routes `localhost` / `127.0.0.1` API/auth traffic to a separate mocker-profile backend. Use `./deploy.sh --local --push` only when local backend code changes need a fresh image.

# Create buildx builder

docker buildx create --name multiarch --use --driver docker-container
docker buildx inspect --bootstrap

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feed` | Get feed of ratings |
| GET | `/api/feed/ratings/{id}` | Get a rating detail page |
| POST | `/api/feed/ratings/{id}/comments` | Create comment |
| POST | `/api/feed/ratings/{id}/like` | Like rating |
| POST | `/api/feed/ratings/{id}/rerate` | Re-rate an item |

---

**Author**: Alex Petrusca  
**Version**: 0.1.0-dev
