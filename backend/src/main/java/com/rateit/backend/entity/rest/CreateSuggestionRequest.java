package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSuggestionRequest(
    @NotBlank @Size(max = 120) String title,
    @Size(max = 4000) String body
) {
}
