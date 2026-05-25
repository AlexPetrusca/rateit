package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.Min;

public record CreateUsersJobRequest(
    @Min(value = 1)
    int count,

    String usernamePrefix,

    String phonePrefix
) {}
