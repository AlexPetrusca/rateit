package com.rateit.backend.entity.rest;

public record S3UploadRequest(
    String filename,
    String contentType
) {}
