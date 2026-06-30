package com.rateit.backend.entity.dto;

public record TourneyPlayerStandingDto(
    Long playerId,
    String playerName,
    int played,
    int wins,
    int losses,
    int pointsFor,
    int pointsAgainst,
    int pointDifferential
) {
}
