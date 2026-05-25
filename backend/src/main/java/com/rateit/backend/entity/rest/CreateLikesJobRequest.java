package com.rateit.backend.entity.rest;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Min;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreateLikesJobRequest(
    @Min(value = 1)
    int count
) {}
