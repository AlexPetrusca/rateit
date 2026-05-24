package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.RatingComment;
import com.rateit.backend.entity.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record RatingCommentDto(
    Long id,
    Long ratingId,
    Long parentCommentId,
    String text,
    BigDecimal score,
    Instant createdAt,
    Author author,
    List<RatingCommentDto> replies
) {
    public static RatingCommentDto fromComment(RatingComment comment) {
        return fromComment(comment, List.of());
    }

    public static RatingCommentDto fromComment(RatingComment comment, List<RatingCommentDto> replies) {
        User author = comment.getAuthorUser();

        return new RatingCommentDto(
            comment.getId(),
            comment.getRating().getId(),
            comment.getParentComment() == null ? null : comment.getParentComment().getId(),
            comment.getText(),
            comment.getScore(),
            comment.getCreatedAt(),
            new Author(
                author.getUsername(),
                author.getProfilePicUrl()
            ),
            replies
        );
    }

    public record Author(
        String username,
        String profilePicUrl
    ) {
    }
}
