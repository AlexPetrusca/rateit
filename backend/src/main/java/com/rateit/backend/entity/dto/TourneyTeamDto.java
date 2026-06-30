package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.TourneyTeam;

public record TourneyTeamDto(
    Long id,
    String name,
    TourneyPlayerDto playerOne,
    TourneyPlayerDto playerTwo
) {
    public static TourneyTeamDto fromTeam(TourneyTeam team) {
        return new TourneyTeamDto(
            team.getId(),
            team.getName(),
            TourneyPlayerDto.fromPlayer(team.getPlayerOne()),
            TourneyPlayerDto.fromPlayer(team.getPlayerTwo())
        );
    }
}
