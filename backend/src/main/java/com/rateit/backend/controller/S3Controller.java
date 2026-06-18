package com.rateit.backend.controller;

import com.rateit.backend.entity.rest.S3UploadRequest;
import com.rateit.backend.entity.rest.S3UploadResponse;
import com.rateit.backend.entity.rest.S3DownloadUrlResponse;
import com.rateit.backend.service.S3Service;
import jakarta.servlet.http.HttpServletRequest;
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
    public ResponseEntity<S3UploadResponse> getPresignedUploadUrl(@RequestBody S3UploadRequest req, HttpServletRequest servletRequest) {
        String bucketName = "images";
        String key = "uploads/" + System.currentTimeMillis() + "_" + req.filename();

        // Generate presigned URL valid for 10 minutes
        String uploadUrl = s3Service.createPresignedUploadUrl(
            bucketName,
            key,
            Duration.ofMinutes(10),
            getForwardedOrigin(servletRequest)
        );

        return ResponseEntity.ok(new S3UploadResponse(uploadUrl, key));
    }

    @GetMapping("/images/url/{*key}")
    public ResponseEntity<S3DownloadUrlResponse> getPresignedDownloadUrlJson(@PathVariable String key, HttpServletRequest servletRequest) {
        String bucketName = "images";

        if (key.startsWith("/")) {
            key = key.substring(1);
        }

        String downloadUrl = s3Service.createPresignedGetUrl(
            bucketName,
            key,
            Duration.ofMinutes(10),
            getForwardedOrigin(servletRequest)
        );

        return ResponseEntity.ok(new S3DownloadUrlResponse(downloadUrl, key));
    }

    @GetMapping("/images/{*key}")
    public ResponseEntity<Void> getPresignedDownloadUrl(@PathVariable String key, HttpServletRequest servletRequest) {
        String bucketName = "images";

        // Strip leading slash
        if (key.startsWith("/")) {
            key = key.substring(1);
        }

        // Generate presigned URL valid for 10 minutes
        String downloadUrl = s3Service.createPresignedGetUrl(
            bucketName,
            key,
            Duration.ofMinutes(10),
            getForwardedOrigin(servletRequest)
        );

        return ResponseEntity.status(HttpStatus.TEMPORARY_REDIRECT)
            .location(URI.create(downloadUrl))
            .build();
    }

    private String getForwardedOrigin(HttpServletRequest request) {
        String host = firstHeader(request, "X-Forwarded-Host");

        if (host == null) {
            return null;
        }

        if (isLocalhost(host)) {
            String proto = firstHeader(request, "X-Forwarded-Proto");
            if (proto == null) {
                proto = request.getScheme();
            }
            return proto + "://" + host;
        }

        return "https://" + host;
    }

    private boolean isLocalhost(String host) {
        return host.equalsIgnoreCase("localhost")
            || host.startsWith("localhost:")
            || host.startsWith("127.0.0.1")
            || host.startsWith("[::1]");
    }

    private String firstHeader(HttpServletRequest request, String name) {
        String value = request.getHeader(name);
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.split(",")[0].trim();
    }
}
