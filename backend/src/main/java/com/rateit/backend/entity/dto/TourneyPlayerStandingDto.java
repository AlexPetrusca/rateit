package com.rateit.backend.entity.dto;

import java.math.BigDecimal;

public record TourneyPlayerStandingDto(
    Long playerId,
    String playerName,
    String profilePicUrl,
    int played,
    int wins,
    int losses,
    int pointsFor,
    int pointsAgainst,
    int pointDifferential,
    BigDecimal eloDelta,
    int byes
) {
}
