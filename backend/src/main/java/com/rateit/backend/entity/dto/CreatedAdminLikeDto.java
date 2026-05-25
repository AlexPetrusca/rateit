package com.rateit.backend.entity.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.rateit.backend.entity.User;

import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreatedAdminLikeDto(
    Long likeId,
    Long ratingId,
    String authorUsername,
    String authorPhoneNumber,
    Instant createdAt
) {
    public static CreatedAdminLikeDto fromUser(Long likeId, Long ratingId, User author, Instant createdAt) {
        return new CreatedAdminLikeDto(
            likeId,
            ratingId,
            author.getUsername(),
            author.getPhoneNumber(),
            createdAt
        );
    }
}
