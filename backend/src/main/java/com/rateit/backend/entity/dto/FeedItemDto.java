package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.MediaAsset;
import com.rateit.backend.entity.RateableItem;
import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingScale;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.types.RateableItemType;

import java.math.BigDecimal;
import java.time.Instant;

public record FeedItemDto(
    Long ratingId,
    BigDecimal score,
    String reviewText,
    Instant createdAt,
    long likeCount,
    long commentCount,
    boolean likedByCurrentUser,
    Author author,
    Item rateableItem,
    Scale ratingScale
) {
    public static FeedItemDto fromRating(Rating rating) {
        return fromRating(rating, 0, 0, false);
    }

    public static FeedItemDto fromRating(
        Rating rating,
        long likeCount,
        long commentCount,
        boolean likedByCurrentUser
    ) {
        User author = rating.getAuthorUser();
        RateableItem item = rating.getRateableItem();
        RatingScale scale = rating.getRatingScale();
        MediaAsset mediaAsset = item.getMediaAsset();
        boolean authorDeleted = author.getDeletedAt() != null;

        return new FeedItemDto(
            rating.getId(),
            rating.getScore(),
            rating.getReviewText(),
            rating.getCreatedAt(),
            likeCount,
            commentCount,
            likedByCurrentUser,
            new Author(
                authorDeleted ? "[deleted]" : author.getUsername(),
                authorDeleted ? null : author.getProfilePicUrl()
            ),
            new Item(
                item.getId(),
                item.getItemType(),
                item.getBody(),
                mediaAsset == null ? null : mediaAsset.getObjectKey()
            ),
            new Scale(
                scale.getName(),
                scale.getSymbol(),
                scale.getMinValue(),
                scale.getMaxValue()
            )
        );
    }

    public record Author(
        String username,
        String profilePicUrl
    ) {
    }

    public record Item(
        Long id,
        RateableItemType type,
        String body,
        String mediaObjectKey
    ) {
    }

    public record Scale(
        String name,
        String symbol,
        BigDecimal min,
        BigDecimal max
    ) {
    }
}
