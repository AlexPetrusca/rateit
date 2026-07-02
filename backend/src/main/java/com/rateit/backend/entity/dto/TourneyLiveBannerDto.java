package com.rateit.backend.entity.dto;

// The current user's in-progress live tournament, for the "LIVE TOURNEY" banner.
public record TourneyLiveBannerDto(
    Long tournamentId,
    String name
) {
}
