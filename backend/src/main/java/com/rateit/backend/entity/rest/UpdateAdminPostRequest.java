package com.rateit.backend.entity.rest;

import com.rateit.backend.entity.types.Visibility;

import java.math.BigDecimal;

public record UpdateAdminPostRequest(
    String title,
    String body,
    String reviewText,
    BigDecimal score,
    Visibility visibility
) {}
