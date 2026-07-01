# Tourney Schema

The tourney backend is intentionally separate from Critic social data. It shares the same PostgreSQL instance and auth system, but all tournament tables use the `tourney_` prefix.

## Core Tables

`tourney_players`
- A reusable player in an organizer's tourney universe.
- Owned by a Critic user through `owner_user_id`.
- Can optionally link to an existing Critic account through `critic_user_id`.
- Supports players who are not Critic users.

`tourney_tournaments`
- One tournament event.
- Has `format`, currently `PARTNER_SWAP` or `FIXED_TEAMS`.
- Partner swap is the main format: every participant can be paired with every other participant.
- Stores `points_to_win` so match/result logic can know what score qualifies as a win.

`tourney_tournament_players`
- Join table for tournament participants.
- Stores per-tournament seed/check-in without duplicating player identity.

`tourney_teams`
- A two-player pairing inside a tournament.
- Stores `player_one_id`, `player_two_id`, plus normalized `player_low_id` and `player_high_id`.
- The normalized pair constraint prevents duplicate teams like `A/B` and `B/A`.

`tourney_matches`
- A match between two tournament teams.
- Scores live on the match row.
- Team membership gives both team-level and individual-level stats.

## Stats Supported

Individual record:
- Join `tourney_matches` through each player's teams.
- Count wins/losses based on whether the player's team score beats the opponent.

Best partner:
- Group completed matches by `(player_id, partner_id)`.
- Use `tourney_teams` to identify the partner and aggregate wins/losses.

Best team/pair:
- Group completed matches by `team_id`.
- Aggregate wins/losses and point differential from `tourney_matches`.

Tournament standings:
- Team standings are derived by team from matches.
- Player standings are derived by expanding each match to the two players on each side.

## Future Elo

`tourney_player_ratings`
- Current rating per player and rating system.
- Starts with player Elo, but can support other systems by `rating_system`.

`tourney_elo_events`
- Rating history/event log.
- Can link to a match for match-result updates or stand alone for manual adjustments.
- Stores rating before, rating after, and delta so ratings are auditable.
