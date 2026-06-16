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
    long likeCount,
    boolean likedByCurrentUser,
    Author author,
    List<RatingCommentDto> replies
) {
    public static RatingCommentDto fromComment(RatingComment comment) {
        return fromComment(comment, 0, false, List.of());
    }

    public static RatingCommentDto fromComment(
        RatingComment comment,
        long likeCount,
        boolean likedByCurrentUser,
        List<RatingCommentDto> replies
    ) {
        User author = comment.getAuthorUser();
        boolean authorDeleted = author.getDeletedAt() != null;

        return new RatingCommentDto(
            comment.getId(),
            comment.getRating().getId(),
            comment.getParentComment() == null ? null : comment.getParentComment().getId(),
            comment.getText(),
            comment.getScore(),
            comment.getCreatedAt(),
            likeCount,
            likedByCurrentUser,
            new Author(
                authorDeleted ? null : author.getId(),
                authorDeleted ? "[deleted]" : author.getUsername(),
                authorDeleted ? null : author.getProfilePicUrl()
            ),
            replies
        );
    }

    public record Author(
        Long userId,
        String username,
        String profilePicUrl
    ) {
    }
}
