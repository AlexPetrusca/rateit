package com.rateit.backend.entity.rest;

public record S3UploadResponse(
    String uploadUrl,
    String key
) {}