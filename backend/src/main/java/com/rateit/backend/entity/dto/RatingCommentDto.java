package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.RatingComment;
import com.rateit.backend.entity.User;

import java.math.BigDecimal;
import java.time.Instant;

public record RatingCommentDto(
    Long id,
    Long ratingId,
    String text,
    BigDecimal score,
    Instant createdAt,
    Author author
) {
    public static RatingCommentDto fromComment(RatingComment comment) {
        User author = comment.getAuthorUser();

        return new RatingCommentDto(
            comment.getId(),
            comment.getRating().getId(),
            comment.getText(),
            comment.getScore(),
            comment.getCreatedAt(),
            new Author(
                author.getUsername(),
                author.getProfilePicUrl()
            )
        );
    }

    public record Author(
        String username,
        String profilePicUrl
    ) {
    }
}
