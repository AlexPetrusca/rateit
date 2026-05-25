package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.Min;

public record CreatePostsJobRequest(
    @Min(value = 1)
    int count,

    String bodyPrefix,

    String reviewPrefix
) {}
