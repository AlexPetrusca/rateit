package com.rateit.backend.entity.dto;

import java.math.BigDecimal;

public record TourneyLeaderboardRowDto(
    int rank,
    Long playerId,
    String playerName,
    BigDecimal elo,
    Double averagePlacement,
    int wins
) {
}
