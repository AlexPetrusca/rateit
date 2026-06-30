package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.NotNull;

public record SaveTourneyTeamRequest(
    @NotNull Long playerOneId,
    @NotNull Long playerTwoId
) {
}
