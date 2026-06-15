package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateAdminCommentRequest(
    @NotBlank String text,
    @NotNull BigDecimal score
) {
}
