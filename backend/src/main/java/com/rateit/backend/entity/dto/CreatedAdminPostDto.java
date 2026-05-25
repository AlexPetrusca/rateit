package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.types.RateableItemType;

import java.math.BigDecimal;

public record CreatedAdminPostDto(
    Long ratingId,
    String title,
    String body,
    String reviewText,
    BigDecimal score,
    String authorUsername,
    String authorPhoneNumber,
    RateableItemType itemType
) {
    public static CreatedAdminPostDto fromFeedItem(FeedItemDto item, User author) {
        return new CreatedAdminPostDto(
            item.ratingId(),
            item.rateableItem().title(),
            item.rateableItem().body(),
            item.reviewText(),
            item.score(),
            item.author().username(),
            author.getPhoneNumber(),
            item.rateableItem().type()
        );
    }
}
