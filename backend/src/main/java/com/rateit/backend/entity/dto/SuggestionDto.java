package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.Suggestion;
import com.rateit.backend.entity.User;

import java.time.Instant;

public record SuggestionDto(
    Long suggestionId,
    Long authorUserId,
    String authorUsername,
    String authorProfilePicUrl,
    String title,
    String body,
    Instant createdAt
) {
    public static SuggestionDto fromSuggestion(Suggestion suggestion) {
        User author = suggestion.getAuthorUser();
        boolean authorDeleted = author.getDeletedAt() != null;

        return new SuggestionDto(
            suggestion.getId(),
            author.getId(),
            authorDeleted ? "[deleted]" : author.getUsername(),
            authorDeleted ? null : author.getProfilePicUrl(),
            suggestion.getTitle(),
            suggestion.getBody(),
            suggestion.getCreatedAt()
        );
    }
}
