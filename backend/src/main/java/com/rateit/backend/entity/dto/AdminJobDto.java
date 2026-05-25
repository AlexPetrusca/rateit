package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.AdminJob;
import com.rateit.backend.entity.types.AdminJobStatus;
import com.rateit.backend.entity.types.AdminJobType;

import java.time.Instant;

public record AdminJobDto(
    Long id,
    AdminJobType jobType,
    AdminJobStatus status,
    String description,
    String resultSummary,
    String errorMessage,
    Instant createdAt,
    Instant startedAt,
    Instant finishedAt
) {
    public static AdminJobDto fromJob(AdminJob job) {
        return new AdminJobDto(
            job.getId(),
            job.getJobType(),
            job.getStatus(),
            job.getDescription(),
            job.getResultSummary(),
            job.getErrorMessage(),
            job.getCreatedAt(),
            job.getStartedAt(),
            job.getFinishedAt()
        );
    }
}
