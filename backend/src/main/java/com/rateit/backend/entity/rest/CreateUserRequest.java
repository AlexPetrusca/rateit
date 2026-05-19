package com.rateit.backend.entity.rest;

public record CreateUserRequest(
    String firstName,
    String lastName,
    String profilePicUrl
) {}
