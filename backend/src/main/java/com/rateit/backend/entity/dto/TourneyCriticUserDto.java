package com.rateit.backend.entity.dto;

public record TourneyCriticUserDto(
    Long userId,
    String username,
    String profilePicUrl,
    boolean playedBefore
) {
}
