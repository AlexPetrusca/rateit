package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateRatingRequest(
    String body,
    String reviewText,
    @NotNull BigDecimal score,
    String mediaObjectKey,
    String mediaContentType
) {
}
