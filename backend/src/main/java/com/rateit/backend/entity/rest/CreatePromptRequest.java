package com.rateit.backend.entity.rest;

public record CreatePromptRequest(
    String body,
    String mediaObjectKey,
    String mediaContentType
) {
}
