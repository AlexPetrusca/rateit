# RateIt ⭐

A Twitter-like social platform for sharing ratings and reviews with threaded star ratings.

## Features

- **Star Ratings**: Rate items on any scale you define
- **Threaded Comments**: Comment on ratings with their own star ratings (0-5 scale)
- **Re-rating**: Update past ratings with explanations of how your opinion changed
- **Social Feed**: See recent ratings from users you follow in real-time
- **Like System**: Show appreciation for great ratings
- **OTP Authentication**: Phone number-based login via SMS

## Tech Stack

**Backend**: Java/Spring Boot with REST API  
**Frontend**: React/Vite  
**Authentication**: OAuth2 JWT + OTP SMS  
**Storage**: AWS S3 for media assets  
**Database**: PostgreSQL via JPA/Hibernate  
**Deployment**: Docker containers

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd rateit

# Start with Docker Compose (recommended)
docker-compose up -d

# Or build locally
cd backend && ./mvnw clean install
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
| POST | `/api/feed/ratings/{id}/comments` | Create comment |
| POST | `/api/feed/ratings/{id}/like` | Like rating |
| POST | `/api/feed/ratings/{id}/rerate` | Re-rate an item |

---

**Author**: Alex Petrusca  
**Version**: 0.1.0-dev
