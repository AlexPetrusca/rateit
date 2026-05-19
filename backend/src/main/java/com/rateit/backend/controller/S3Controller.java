package com.rateit.backend.controller;

import com.rateit.backend.entity.rest.S3UploadRequest;
import com.rateit.backend.entity.rest.S3UploadResponse;
import com.rateit.backend.service.S3Service;
import lombok.RequiredArgsConstructor;
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

    @PostMapping("/images")
    public ResponseEntity<S3UploadResponse> getPresignedUploadUrl(@RequestBody S3UploadRequest req) {
        String bucketName = "images";
        String key = "uploads/" + System.currentTimeMillis() + "_" + req.filename();

        // Generate presigned URL valid for 10 minutes
        String uploadUrl = s3Service.createPresignedUploadUrl(bucketName, key, Duration.ofMinutes(10));

        return ResponseEntity.ok(new S3UploadResponse(uploadUrl, key));
    }

    @GetMapping("/images/{*key}")
    public ResponseEntity<Void> getPresignedDownloadUrl(@PathVariable String key) {
        String bucketName = "images";

        // Strip leading slash
        if (key.startsWith("/")) {
            key = key.substring(1);
        }

        // Generate presigned URL valid for 10 minutes
        String downloadUrl = s3Service.createPresignedGetUrl(bucketName, key, Duration.ofMinutes(10));

        return ResponseEntity.status(HttpStatus.TEMPORARY_REDIRECT)
            .location(URI.create(downloadUrl))
            .build();
    }
}
