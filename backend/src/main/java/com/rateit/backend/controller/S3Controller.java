package com.rateit.backend.controller;

import com.rateit.backend.entity.rest.S3UploadRequest;
import com.rateit.backend.entity.rest.S3UploadResponse;
import com.rateit.backend.entity.rest.S3DownloadUrlResponse;
import com.rateit.backend.service.S3Service;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.Duration;

@RestController
@RequestMapping("/api/s3")
@RequiredArgsConstructor
public class S3Controller {

    private final S3Service s3Service;

    // Object storage bucket + key prefix for image uploads. Defaults keep local
    // dev on MinIO (bucket "images", no prefix); prod overrides to DO Spaces
    // (bucket "critic-media", prefix "images/") via env. The stored/returned
    // objectKey stays prefix-free (e.g. "uploads/x") so display URLs (/images/x)
    // are unchanged; the prefix is applied only to the physical S3 key.
    @Value("${storage.image-bucket:images}")
    private String imageBucket;

    @Value("${storage.image-key-prefix:}")
    private String imageKeyPrefix;

    @PostMapping("/images")
    public ResponseEntity<S3UploadResponse> getPresignedUploadUrl(@RequestBody S3UploadRequest req) {
        String objectKey = "uploads/" + System.currentTimeMillis() + "_" + req.filename();

        // Presign against the configured storage endpoint (Spaces in prod) so the
        // browser PUTs straight to it (CORS-enabled). Valid 10 minutes.
        String uploadUrl = s3Service.createPresignedUploadUrl(
            imageBucket,
            imageKeyPrefix + objectKey,
            Duration.ofMinutes(10)
        );

        return ResponseEntity.ok(new S3UploadResponse(uploadUrl, objectKey));
    }

    @GetMapping("/images/url/{*key}")
    public ResponseEntity<S3DownloadUrlResponse> getPresignedDownloadUrlJson(@PathVariable String key) {
        if (key.startsWith("/")) {
            key = key.substring(1);
        }

        String downloadUrl = s3Service.createPresignedGetUrl(
            imageBucket,
            imageKeyPrefix + key,
            Duration.ofMinutes(10)
        );

        return ResponseEntity.ok(new S3DownloadUrlResponse(downloadUrl, key));
    }

    @GetMapping("/images/{*key}")
    public ResponseEntity<Void> getPresignedDownloadUrl(@PathVariable String key) {
        if (key.startsWith("/")) {
            key = key.substring(1);
        }

        String downloadUrl = s3Service.createPresignedGetUrl(
            imageBucket,
            imageKeyPrefix + key,
            Duration.ofMinutes(10)
        );

        return ResponseEntity.status(HttpStatus.TEMPORARY_REDIRECT)
            .location(URI.create(downloadUrl))
            .build();
    }
}
