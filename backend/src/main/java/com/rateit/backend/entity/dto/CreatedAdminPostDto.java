package com.rateit.backend.entity.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.types.RateableItemType;

import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreatedAdminPostDto(
    Long ratingId,
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
            item.rateableItem().body(),
            item.reviewText(),
            item.score(),
            item.author().username(),
            author.getPhoneNumber(),
            item.rateableItem().type()
        );
    }
}
