package com.rateit.backend.entity.rest;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreateCommentsJobRequest(
    @Min(value = 1)
    int count,

    @Min(value = 1)
    int maxDepth,

    @DecimalMin(value = "0.0")
    @DecimalMax(value = "1.0")
    double replyChance,

    String commentPrefix,

    String replyPrefix
) {}
