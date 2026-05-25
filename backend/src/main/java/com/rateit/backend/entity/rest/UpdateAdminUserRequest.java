package com.rateit.backend.entity.rest;

public record UpdateAdminUserRequest(
    String phoneNumber,
    String username,
    String profilePicUrl,
    String role
) {}
