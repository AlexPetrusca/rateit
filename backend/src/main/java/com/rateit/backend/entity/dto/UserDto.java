package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.User;

public record UserDto(
    Long userId,
    String phoneNumber,
    String username,
    String profilePicUrl
) {
    public static UserDto fromUser(User user) {
        return new UserDto(
            user.getId(),
            user.getPhoneNumber(),
            user.getUsername(),
            user.getProfilePicUrl()
        );
    }
}
