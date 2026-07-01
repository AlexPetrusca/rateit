package com.rateit.backend.entity.dto;

import java.math.BigDecimal;

public record TourneyLeaderboardRowDto(
    int rank,
    Long playerId,
    String playerName,
    String profilePicUrl,
    BigDecimal elo,
    Double averagePlacement,
    int wins
) {
}
