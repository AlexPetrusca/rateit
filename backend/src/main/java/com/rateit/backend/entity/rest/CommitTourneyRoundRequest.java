package com.rateit.backend.entity.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

// Commit a round's games. Each game is two 2-player teams. Used by both the live
// flow (auto-generated, possibly hand-adjusted groupings) and historical entry.
public record CommitTourneyRoundRequest(
    @NotNull Integer roundNumber,
    @NotEmpty @Valid List<RoundGame> games
) {
    public record RoundGame(
        @NotNull @Size(min = 2, max = 2) List<Long> teamAPlayerIds,
        @NotNull @Size(min = 2, max = 2) List<Long> teamBPlayerIds
    ) {
    }
}
