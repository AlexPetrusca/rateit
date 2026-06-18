package com.rateit.backend.entity.rest;

public record S3DownloadUrlResponse(
    String downloadUrl,
    String key
) {}
