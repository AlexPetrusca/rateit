package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.Rating;

import java.math.BigDecimal;
import java.time.Instant;

public record DraftDto(
    Long id,
    String body,
    String reviewText,
    BigDecimal score,
    String mediaObjectKey,
    Instant updatedAt
) {
    public static DraftDto from(Rating r) {
        return new DraftDto(
            r.getId(),
            r.getDraftBody(),
            r.getReviewText(),
            r.getScore(),
            r.getDraftMediaKey(),
            r.getUpdatedAt()
        );
    }
}
