package com.rateit.backend.entity.rest;

import java.math.BigDecimal;

public record SaveDraftRequest(
    Long id,
    String body,
    String reviewText,
    BigDecimal score,
    String mediaObjectKey,
    String mediaContentType
) {
}
