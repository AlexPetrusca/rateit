package com.rateit.backend.entity.dto;

import java.math.BigDecimal;

public record TopicDto(
    Long id,
    String title,
    String body,
    String mediaObjectKey,
    long ratingCount,
    BigDecimal averageScore
) {
}
