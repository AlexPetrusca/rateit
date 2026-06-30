package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.TourneyTournamentPlayer;

public record TourneyTournamentPlayerDto(
    Long id,
    TourneyPlayerDto player,
    Integer seedNumber,
    Boolean checkedIn
) {
    public static TourneyTournamentPlayerDto fromTournamentPlayer(TourneyTournamentPlayer tournamentPlayer) {
        return new TourneyTournamentPlayerDto(
            tournamentPlayer.getId(),
            TourneyPlayerDto.fromPlayer(tournamentPlayer.getPlayer()),
            tournamentPlayer.getSeedNumber(),
            tournamentPlayer.getCheckedIn()
        );
    }
}
