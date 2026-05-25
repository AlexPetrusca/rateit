package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.types.UserRoles;

import java.time.Instant;

public record UserProfileDto(
    Long userId,
    String phoneNumber,
    String username,
    String profilePicUrl,
    String role,
    Instant deletedAt,
    Instant createdAt,
    long postCount
) {
    public static UserProfileDto fromUser(User user, long postCount) {
        return new UserProfileDto(
            user.getId(),
            user.getPhoneNumber(),
            user.getUsername(),
            user.getProfilePicUrl(),
            user.getRole() != null ? user.getRole() : UserRoles.USER,
            user.getDeletedAt(),
            user.getCreatedAt(),
            postCount
        );
    }
}
