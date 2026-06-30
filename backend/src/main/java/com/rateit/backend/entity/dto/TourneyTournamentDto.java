package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.TourneyTournament;
import com.rateit.backend.entity.types.TourneyTournamentFormat;
import com.rateit.backend.entity.types.TourneyTournamentMode;
import com.rateit.backend.entity.types.TourneyTournamentStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record TourneyTournamentDto(
    Long id,
    String name,
    String location,
    LocalDate tournamentDate,
    TourneyTournamentStatus status,
    TourneyTournamentFormat format,
    TourneyTournamentMode mode,
    Integer courtCount,
    Integer pointsToWin,
    String notes,
    Instant createdAt,
    Instant updatedAt,
    int playerCount,
    int teamCount,
    int matchCount,
    List<TourneyTournamentPlayerDto> players,
    List<TourneyTeamDto> teams,
    List<TourneyMatchDto> matches,
    List<TourneyStandingDto> teamStandings,
    List<TourneyPlayerStandingDto> playerStandings
) {
    public static TourneyTournamentDto summary(TourneyTournament tournament, int playerCount, int teamCount, int matchCount) {
        return detail(tournament, playerCount, teamCount, matchCount, List.of(), List.of(), List.of(), List.of(), List.of());
    }

    public static TourneyTournamentDto detail(
        TourneyTournament tournament,
        int playerCount,
        int teamCount,
        int matchCount,
        List<TourneyTournamentPlayerDto> players,
        List<TourneyTeamDto> teams,
        List<TourneyMatchDto> matches,
        List<TourneyStandingDto> teamStandings,
        List<TourneyPlayerStandingDto> playerStandings
    ) {
        return new TourneyTournamentDto(
            tournament.getId(),
            tournament.getName(),
            tournament.getLocation(),
            tournament.getTournamentDate(),
            tournament.getStatus(),
            tournament.getFormat(),
            tournament.getMode(),
            tournament.getCourtCount(),
            tournament.getPointsToWin(),
            tournament.getNotes(),
            tournament.getCreatedAt(),
            tournament.getUpdatedAt(),
            playerCount,
            teamCount,
            matchCount,
            players,
            teams,
            matches,
            teamStandings,
            playerStandings
        );
    }
}
