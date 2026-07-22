package com.rateit.backend.entity.dto;

import java.time.LocalDate;
import java.util.List;

// One finished game told from the logged-in player's side: who they played with,
// who they played against, and whether they won. The raw TourneyMatchDto is
// team-A/team-B shaped, which the caller would otherwise have to re-orient itself.
public record TourneyMyMatchDto(
    Long matchId,
    Long tournamentId,
    String tournamentName,
    boolean isMatch,
    LocalDate playedOn,
    Integer roundNumber,
    List<String> teammates,
    List<String> opponents,
    Integer myScore,
    Integer opponentScore,
    boolean won
) {
}
