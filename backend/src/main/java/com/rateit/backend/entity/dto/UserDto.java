package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.User;

import java.time.Instant;

public record UserDto(
    Long userId,
    String phoneNumber,
    String username,
    String profilePicUrl,
    String role,
    Instant deletedAt
) {
    public static UserDto fromUser(User user) {
        return new UserDto(
            user.getId(),
            user.getPhoneNumber(),
            user.getUsername(),
            user.getProfilePicUrl(),
            user.getRole() != null ? user.getRole() : "ROLE_USER",
            user.getDeletedAt()
        );
    }
}
