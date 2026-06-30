package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.Min;

public record UpdateTourneyMatchScoreRequest(
    @Min(0) Integer teamAScore,
    @Min(0) Integer teamBScore,
    String court
) {
}
