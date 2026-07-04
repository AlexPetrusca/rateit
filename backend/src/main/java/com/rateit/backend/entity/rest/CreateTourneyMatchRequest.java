package com.rateit.backend.entity.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

// One rated match: two fixed doubles teams playing one or more games. Persisted as
// a lightweight tournament (mode=MATCH) so it flows through the shared Elo engine.
public record CreateTourneyMatchRequest(
    LocalDate tournamentDate,
    @Size(max = 160) String location,
    @Size(max = 160) String event,
    @Size(max = 32) String scoringStyle,
    @NotNull @Size(min = 2, max = 2) List<Long> teamAPlayerIds,
    @NotNull @Size(min = 2, max = 2) List<Long> teamBPlayerIds,
    @NotEmpty @Valid List<GameScore> games
) {
    public record GameScore(
        @NotNull Integer teamAScore,
        @NotNull Integer teamBScore
    ) {
    }
}
