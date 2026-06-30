package com.rateit.backend.entity.dto;

public record TourneyStandingDto(
    Long teamId,
    String teamName,
    int played,
    int wins,
    int losses,
    int pointsFor,
    int pointsAgainst,
    int pointDifferential
) {
}
