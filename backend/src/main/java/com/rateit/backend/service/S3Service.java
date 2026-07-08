package com.rateit.backend.service;

import io.awspring.cloud.s3.S3Template;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class S3Service {

    private final S3Presigner s3Presigner;
    private final S3Template s3Template;

    @Value("${spring.cloud.aws.credentials.access-key}")
    private String accessKey;

    @Value("${spring.cloud.aws.credentials.secret-key}")
    private String secretKey;

    @Value("${spring.cloud.aws.region.static}")
    private String region;

    public void uploadString(String bucket, String key, String content) {
        s3Template.upload(bucket, key, new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));
    }

    public String createPresignedUploadUrl(String bucket, String key, Duration duration) {
        return createPresignedUploadUrl(bucket, key, duration, null);
    }

    public String createPresignedUploadUrl(String bucket, String key, Duration duration, String endpoint) {
        // public-read so the object is served anonymously (DO Spaces has no bucket
        // policy support; per-object ACL is how we make uploads publicly viewable).
        // The client must send the matching `x-amz-acl: public-read` header.
        PutObjectRequest objectRequest = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .acl(ObjectCannedACL.PUBLIC_READ)
            .build();

        S3Presigner presigner = endpoint == null ? s3Presigner : buildPresigner(endpoint);
        PresignedPutObjectRequest presignedRequest;
        try {
            presignedRequest = presigner.presignPutObject(presignRequest -> presignRequest
                .signatureDuration(duration)
                .putObjectRequest(objectRequest));
        } finally {
            if (endpoint != null) {
                presigner.close();
            }
        }

        return presignedRequest.url().toString();
    }

    public String createPresignedGetUrl(String bucket, String key, Duration duration) {
        return createPresignedGetUrl(bucket, key, duration, null);
    }

    public String createPresignedGetUrl(String bucket, String key, Duration duration, String endpoint) {
        software.amazon.awssdk.services.s3.model.GetObjectRequest objectRequest = software.amazon.awssdk.services.s3.model.GetObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build();

        S3Presigner presigner = endpoint == null ? s3Presigner : buildPresigner(endpoint);
        software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest presignedRequest;
        try {
            presignedRequest = presigner.presignGetObject(presignRequest -> presignRequest
                .signatureDuration(duration)
                .getObjectRequest(objectRequest));
        } finally {
            if (endpoint != null) {
                presigner.close();
            }
        }

        return presignedRequest.url().toString();
    }

    private S3Presigner buildPresigner(String endpoint) {
        return S3Presigner.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
            .region(Region.of(region))
            .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
            .build();
    }
}
