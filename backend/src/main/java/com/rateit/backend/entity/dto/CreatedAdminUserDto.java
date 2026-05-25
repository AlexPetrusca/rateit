package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.User;

public record CreatedAdminUserDto(
    Long userId,
    String username,
    String phoneNumber,
    String role
) {
    public static CreatedAdminUserDto fromUser(User user) {
        return new CreatedAdminUserDto(
            user.getId(),
            user.getUsername(),
            user.getPhoneNumber(),
            user.getRole()
        );
    }
}
