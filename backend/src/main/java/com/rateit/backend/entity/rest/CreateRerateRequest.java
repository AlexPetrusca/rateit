package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateRerateRequest(
    @NotNull BigDecimal score,
    String reviewText
) {
}
