package com.rateit.backend.entity.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.rateit.backend.entity.User;

import java.math.BigDecimal;
import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreatedAdminCommentDto(
    Long commentId,
    Long ratingId,
    Long parentCommentId,
    String text,
    BigDecimal score,
    String authorUsername,
    String authorPhoneNumber,
    Instant createdAt
) {
    public static CreatedAdminCommentDto fromComment(RatingCommentDto comment, User author) {
        return new CreatedAdminCommentDto(
            comment.id(),
            comment.ratingId(),
            comment.parentCommentId(),
            comment.text(),
            comment.score(),
            author.getUsername(),
            author.getPhoneNumber(),
            comment.createdAt()
        );
    }
}
