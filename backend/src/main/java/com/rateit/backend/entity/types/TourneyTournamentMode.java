package com.rateit.backend.entity.types;

public enum TourneyTournamentMode {
    // Run round-by-round in real time (auto-generated Mexicano pairings).
    LIVE,
    // Back-fill a finished event: edit all matchups and scores freely.
    HISTORICAL
}
