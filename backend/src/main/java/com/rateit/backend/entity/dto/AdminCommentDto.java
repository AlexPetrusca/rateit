package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.RatingComment;
import com.rateit.backend.entity.User;

import java.math.BigDecimal;
import java.time.Instant;

public record AdminCommentDto(
    Long commentId,
    Long ratingId,
    Long parentCommentId,
    String authorUsername,
    String authorProfilePicUrl,
    String text,
    BigDecimal score,
    Instant createdAt
) {
    public static AdminCommentDto fromComment(RatingComment comment) {
        User author = comment.getAuthorUser();
        boolean authorDeleted = author.getDeletedAt() != null;

        return new AdminCommentDto(
            comment.getId(),
            comment.getRating().getId(),
            comment.getParentComment() == null ? null : comment.getParentComment().getId(),
            authorDeleted ? "[deleted]" : author.getUsername(),
            authorDeleted ? null : author.getProfilePicUrl(),
            comment.getText(),
            comment.getScore(),
            comment.getCreatedAt()
        );
    }
}
