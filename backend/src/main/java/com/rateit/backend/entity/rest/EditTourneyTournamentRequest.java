package com.rateit.backend.entity.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

// Full replace of a tournament's editable state: name, date, roster, and every
// round's games (teams + scores). Used by the "edit finished tournament" screen.
public record EditTourneyTournamentRequest(
    @NotBlank @Size(max = 160) String name,
    LocalDate tournamentDate,
    @NotNull List<Long> playerIds,
    @NotNull @Valid List<EditRound> rounds
) {
    public record EditRound(
        @NotNull Integer roundNumber,
        @NotEmpty @Valid List<CommitTourneyRoundRequest.RoundGame> games
    ) {
    }
}
