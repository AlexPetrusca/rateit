package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.types.FollowRelation;

public record UserSearchResultDto(
    Long userId,
    String username,
    String profilePicUrl,
    FollowRelation followRelation
) {
    public static UserSearchResultDto fromUser(User user, FollowRelation followRelation) {
        return new UserSearchResultDto(
            user.getId(),
            user.getUsername(),
            user.getProfilePicUrl(),
            followRelation
        );
    }
}
