package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record CreateRatingCommentRequest(
    @NotBlank String text,
    BigDecimal score
) {
}
