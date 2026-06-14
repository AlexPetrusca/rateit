package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.NotBlank;

public record CreateUserRequest(
    @NotBlank(message = "Username is required")
    String username,
    String profilePicUrl
) {}
