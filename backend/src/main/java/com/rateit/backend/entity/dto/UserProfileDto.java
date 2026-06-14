package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.types.FollowRelation;

public record UserProfileDto(
    String username,
    String profilePicUrl,
    FollowRelation followRelation,
    long followerCount,
    long followingCount
) {
    public static UserProfileDto fromUser(
        User user,
        FollowRelation followRelation,
        long followerCount,
        long followingCount
    ) {
        return new UserProfileDto(
            user.getUsername(),
            user.getProfilePicUrl(),
            followRelation,
            followerCount,
            followingCount
        );
    }
}
