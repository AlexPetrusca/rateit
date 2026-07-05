package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.TourneyMatch;

import java.math.BigDecimal;
import java.time.Instant;

public record TourneyMatchDto(
    Long id,
    Long teamAId,
    String teamAName,
    Long teamBId,
    String teamBName,
    Integer roundNumber,
    String roundName,
    String court,
    Instant scheduledAt,
    Integer teamAScore,
    Integer teamBScore,
    boolean completed,
    // Team A's Elo change for this game (team B's is the negation); null if unrated.
    BigDecimal teamAEloDelta
) {
    public static TourneyMatchDto fromMatch(TourneyMatch match) {
        return fromMatch(match, null);
    }

    public static TourneyMatchDto fromMatch(TourneyMatch match, BigDecimal teamAEloDelta) {
        return new TourneyMatchDto(
            match.getId(),
            match.getTeamA().getId(),
            match.getTeamA().getName(),
            match.getTeamB().getId(),
            match.getTeamB().getName(),
            match.getRoundNumber(),
            match.getRoundName(),
            match.getCourt(),
            match.getScheduledAt(),
            match.getTeamAScore(),
            match.getTeamBScore(),
            match.getTeamAScore() != null && match.getTeamBScore() != null,
            teamAEloDelta
        );
    }
}
