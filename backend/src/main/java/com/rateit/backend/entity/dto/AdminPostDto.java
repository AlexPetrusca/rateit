package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.types.RateableItemType;
import com.rateit.backend.entity.types.Visibility;

import java.math.BigDecimal;
import java.time.Instant;

public record AdminPostDto(
    Long ratingId,
    Long rateableItemId,
    Long authorUserId,
    String authorUsername,
    String authorProfilePicUrl,
    RateableItemType itemType,
    String title,
    String body,
    String reviewText,
    BigDecimal score,
    Visibility visibility,
    String mediaObjectKey,
    long likeCount,
    long commentCount,
    Instant createdAt
) {
    public static AdminPostDto fromRating(Rating rating, long likeCount, long commentCount) {
        User author = rating.getAuthorUser();
        boolean authorDeleted = author.getDeletedAt() != null;

        return new AdminPostDto(
            rating.getId(),
            rating.getRateableItem().getId(),
            author.getId(),
            authorDeleted ? "[deleted]" : author.getUsername(),
            authorDeleted ? null : author.getProfilePicUrl(),
            rating.getRateableItem().getItemType(),
            rating.getRateableItem().getTitle(),
            rating.getRateableItem().getBody(),
            rating.getReviewText(),
            rating.getScore(),
            rating.getVisibility(),
            rating.getRateableItem().getMediaAsset() == null ? null : rating.getRateableItem().getMediaAsset().getObjectKey(),
            likeCount,
            commentCount,
            rating.getCreatedAt()
        );
    }
}
