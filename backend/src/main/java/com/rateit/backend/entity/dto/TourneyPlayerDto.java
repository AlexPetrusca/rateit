package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.TourneyPlayer;
import com.rateit.backend.entity.User;

public record TourneyPlayerDto(
    Long id,
    String displayName,
    Long criticUserId,
    String criticUsername,
    String profilePicUrl,
    String notes
) {
    public static TourneyPlayerDto fromPlayer(TourneyPlayer player) {
        User criticUser = player.getCriticUser();
        return new TourneyPlayerDto(
            player.getId(),
            player.getDisplayName(),
            criticUser == null ? null : criticUser.getId(),
            criticUser == null ? null : criticUser.getUsername(),
            criticUser == null ? null : criticUser.getProfilePicUrl(),
            player.getNotes()
        );
    }
}
