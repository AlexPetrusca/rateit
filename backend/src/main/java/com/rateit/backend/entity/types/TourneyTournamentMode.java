package com.rateit.backend.entity.types;

public enum TourneyTournamentMode {
    // Run round-by-round in real time (auto-generated Mexicano pairings).
    LIVE,
    // Back-fill a finished event: edit all matchups and scores freely.
    HISTORICAL,
    // A single rated match (one or more games between two fixed doubles teams).
    // Persisted as a lightweight tournament so it flows through the shared Elo
    // engine, but hidden from the tournaments list and tournament-count stats.
    MATCH
}
