# Tourney

## Summary

Tourney is a new Spikeball tournament management app that lives alongside Critic, but is conceptually separate from the Critic social product.

The intended production path is:

- `app.critic-app.com/tourney`

The app should share the existing infrastructure:

- Same DigitalOcean Kubernetes cluster.
- Same PostgreSQL instance.
- Same backend deployment pipeline.
- Optional linkage to existing Critic accounts.

The frontend for this new app should live in `mobile-tourney`. The existing `frontend/` folder is legacy, and the existing `mobile/` folder is the current Critic Expo web/mobile app.

Development and testing are currently done directly against the live DigitalOcean environment. Local backend development is not part of the workflow right now.

## Requirements

The tourney backend needs to support:

- Players.
- Players optionally tied to Critic accounts.
- Teams made of two players.
- Tournaments.
- Scores and completed match results.
- Partner-swap tournaments, where each individual plays with each other individual.
- Future Elo/rating support.

The stats model should make it possible to answer questions like:

- Which players do I win the most with?
- Which teams/pairs win the most?
- What is my individual win/loss record?
- What are tournament standings by team?
- What are tournament standings by individual player?
- How can match history later feed an Elo system?

## Built

Backend schema and API foundations have been added under `/api/tourney`.

Implemented backend concepts:

- `TourneyPlayer`
- `TourneyTournament`
- `TourneyTournamentPlayer`
- `TourneyTeam`
- `TourneyMatch`
- `TourneyPlayerRating`
- `TourneyEloEvent`

Implemented backend support includes:

- Create/list tourney players.
- Create/list/update tournaments.
- Add/remove tournament players.
- Create/delete teams.
- Generate partner-swap teams.
- Generate round-robin schedules while skipping team matchups that share a player.
- Update match scores.
- Compute team standings.
- Compute individual player standings.

The schema is documented in more detail in `docs/tourney/schema.md`.

Frontend scaffold:

- A new Expo app exists under `mobile-tourney`.
- It includes auth/session handling, a login screen, a tourney screen, API service wiring, and basic styling.
- This is a starting point, not a finished tournament management UI.

Deploy pipeline updates:

- Root `deploy.sh` defaults to backend-only deployment.
- Remote deploys automatically use the single-node deployment scope.
- Frontend upload is skipped unless `--with-frontend` is passed.
- Nginx restart is skipped unless `--restart-nginx` is passed.
- Missing local `rateit-chart/values.secret.yaml` is handled by generating a temporary values overlay from existing Kubernetes secrets.
- The chart secrets template only renders secret resources when secret values are supplied.

Live deploy state:

- The backend tourney API has been deployed.
- A smoke test to `https://app.critic-app.com/api/tourney/players` returns `401`, which confirms the route exists and is protected by auth.

## Still In Progress

Routing:

- `app.critic-app.com/tourney` is not fully wired as a separate hosted experience yet.
- The current production nginx serves the Critic frontend from the MinIO `frontend` bucket.
- Both `mobile/scripts/deploy.sh` and `frontend/scripts/deploy.sh` upload to that same `frontend` bucket.
- The live Critic frontend is currently the Expo build from `mobile/`; do not deploy `frontend/scripts/deploy.sh` unless intentionally reverting to the legacy Vite app.

Tourney frontend:

- `mobile-tourney` has a scaffold, but it has not been deployed to a separate `/tourney` path.
- A production deployment strategy is still needed for the tourney web bundle.
- Options include a separate MinIO bucket/prefix plus nginx route, or serving it through the backend/static layer.

Backend product behavior:

- The API exists, but the tournament workflow needs real usage hardening.
- Auth/authorization rules should be reviewed for organizer ownership and participant access.
- Validation should be tightened around tournament state transitions, duplicate generation, score edits, and destructive actions.
- The partner-swap scheduling behavior should be tested against real tournament formats and court/time constraints.

Elo:

- Rating tables exist for future Elo support.
- Elo calculation and rating update workflows have not been implemented yet.

Testing:

- Backend tests passed after the initial implementation.
- More focused tourney tests are still needed for schedule generation, standings, match scoring, and authorization.

Git/deploy hygiene:

- A local commit was created for the tourney backend/mobile/deploy work, but pushing from the agent shell was blocked by missing GitHub credentials.
- There is an old untracked SQL backup file in the repo root: `critic-db-backup-20260627-221548.sql`.

## Operational Notes

Backend-only deploy:

```bash
./deploy.sh
```

Deploy backend using an already-pushed image:

```bash
IMAGE_TAG=<tag> ./deploy.sh --skip-push
```

Deploy the current Critic Expo frontend:

```bash
cd mobile/scripts
./deploy.sh
```

Avoid this unless intentionally deploying the legacy frontend:

```bash
cd frontend/scripts
./deploy.sh
```

Root deploy can include the current Critic Expo frontend only when explicitly requested:

```bash
./deploy.sh --with-frontend
```

