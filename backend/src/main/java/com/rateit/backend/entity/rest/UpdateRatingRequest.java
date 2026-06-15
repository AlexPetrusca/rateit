package com.rateit.backend.entity.rest;

import java.math.BigDecimal;

public record UpdateRatingRequest(
    String body,
    String reviewText,
    BigDecimal score
) {
}
