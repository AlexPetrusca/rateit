package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.NotNull;

public record AddTourneyTournamentPlayerRequest(
    @NotNull Long playerId,
    Integer seedNumber,
    Boolean checkedIn
) {
}
