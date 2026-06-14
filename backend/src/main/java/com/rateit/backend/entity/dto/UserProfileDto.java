package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.User;

public record UserProfileDto(
    String username,
    String profilePicUrl
) {
    public static UserProfileDto fromUser(User user) {
        return new UserProfileDto(
            user.getUsername(),
            user.getProfilePicUrl()
        );
    }
}
