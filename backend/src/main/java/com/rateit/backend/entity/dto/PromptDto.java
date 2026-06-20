package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.RateableItem;

import java.time.Instant;

public record PromptDto(
    Long id,
    String body,
    String mediaObjectKey,
    Instant createdAt,
    Long authorUserId,
    String authorUsername,
    String authorProfilePicUrl
) {
    public static PromptDto from(RateableItem item) {
        return new PromptDto(
            item.getId(),
            item.getBody(),
            item.getMediaAsset() == null ? null : item.getMediaAsset().getObjectKey(),
            item.getCreatedAt(),
            item.getCreatedByUser().getId(),
            item.getCreatedByUser().getUsername(),
            item.getCreatedByUser().getProfilePicUrl()
        );
    }
}
