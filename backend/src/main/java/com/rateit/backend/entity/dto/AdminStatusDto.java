package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.User;

public record AdminStatusDto(
    Long userId,
    String phoneNumber,
    String username,
    String role
) {
    public static AdminStatusDto fromUser(User user) {
        return new AdminStatusDto(
            user.getId(),
            user.getPhoneNumber(),
            user.getUsername(),
            user.getRole() != null ? user.getRole() : "ROLE_USER"
        );
    }
}
