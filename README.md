# RateIt

RateIt is a social app for ratings and reviews with threaded comments, a feed, user profiles, post detail pages, and an admin automation console.

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
cd rateit

# Start with Docker Compose (recommended)
docker-compose up -d

# Or build locally
cd backend && ./mvnw spring-boot:run
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
