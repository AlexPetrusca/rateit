package com.rateit.backend.entity.rest;

import com.rateit.backend.entity.types.TourneyTournamentStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

// Full replace of a tournament's editable state: name, date, roster, and every
// round's games (teams + scores). Used by the "edit finished tournament" screen
// and by historical results entry (which also flips status to COMPLETE).
public record EditTourneyTournamentRequest(
    @NotBlank @Size(max = 160) String name,
    LocalDate tournamentDate,
    TourneyTournamentStatus status,
    @NotNull List<Long> playerIds,
    @NotNull @Valid List<EditRound> rounds
) {
    public record EditRound(
        @NotNull Integer roundNumber,
        @NotEmpty @Valid List<CommitTourneyRoundRequest.RoundGame> games
    ) {
    }
}
