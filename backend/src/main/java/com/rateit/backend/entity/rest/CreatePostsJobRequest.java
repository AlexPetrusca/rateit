package com.rateit.backend.entity.rest;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Min;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreatePostsJobRequest(
    @Min(value = 1)
    int count,

    String bodyPrefix,

    String reviewPrefix
) {}
