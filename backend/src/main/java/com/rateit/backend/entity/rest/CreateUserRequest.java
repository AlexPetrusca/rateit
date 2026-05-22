package com.rateit.backend.entity.rest;

public record CreateUserRequest(
    String username,
    String profilePicUrl
) {}
