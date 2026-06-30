package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SaveTourneyPlayerRequest(
    @NotBlank @Size(max = 120) String displayName,
    Long criticUserId,
    @Size(max = 4000) String notes
) {
}
