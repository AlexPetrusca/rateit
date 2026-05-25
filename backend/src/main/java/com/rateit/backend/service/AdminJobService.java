package com.rateit.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rateit.backend.entity.AdminJob;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.AdminJobDetailDto;
import com.rateit.backend.entity.dto.AdminJobDto;
import com.rateit.backend.entity.dto.CreatedAdminUserDto;
import com.rateit.backend.entity.rest.CreateUsersJobRequest;
import com.rateit.backend.entity.types.AdminJobStatus;
import com.rateit.backend.entity.types.AdminJobType;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.repository.AdminJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminJobService {

    private static final String TEST_USER_ROLE = "ROLE_TEST_USER";
    private static final String DEFAULT_PHONE_PREFIX = "+1555000";
    private static final String DEFAULT_USERNAME_PREFIX = "test_user";

    private final AdminJobRepository adminJobRepository;
    private final ObjectMapper objectMapper;
    private final UserService userService;

    @Transactional
    public AdminJobDto queueCreateUsersJob(CreateUsersJobRequest request) {
        String usernamePrefix = normalizeUsernamePrefix(request.usernamePrefix());
        String phonePrefix = normalizePhonePrefix(request.phonePrefix());

        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_USER)
            .status(AdminJobStatus.PENDING)
            .description(String.format("Create %d test users", request.count()))
            .payloadJson(writePayload(new CreateUsersJobRequest(request.count(), usernamePrefix, phonePrefix)))
            .build();

        return AdminJobDto.fromJob(adminJobRepository.save(job));
    }

    @Transactional(readOnly = true)
    public List<AdminJobDto> listJobs(int limit) {
        int pageSize = Math.max(1, limit);
        return adminJobRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, pageSize, Sort.by(Sort.Direction.DESC, "createdAt")))
            .stream()
            .map(AdminJobDto::fromJob)
            .toList();
    }

    @Transactional
    public AdminJob claimNextPendingJob() {
        return adminJobRepository.findFirstByStatusOrderByCreatedAtAsc(AdminJobStatus.PENDING)
            .map(job -> {
                job.setStatus(AdminJobStatus.IN_PROGRESS);
                job.setStartedAt(Instant.now());
                job.setErrorMessage(null);
                job.setResultSummary(null);
                return adminJobRepository.save(job);
            })
            .orElse(null);
    }

    @Transactional
    public void executeCreateUsersJob(long jobId) {
        AdminJob job = adminJobRepository.findById(jobId)
            .orElseThrow(() -> ResourceNotFoundException.resource(com.rateit.backend.entity.types.Resource.ADMIN_JOB, jobId));

        if (job.getJobType() != AdminJobType.CREATE_USER) {
            throw new IllegalStateException("Unsupported job type: " + job.getJobType());
        }

        CreateUsersJobRequest request = readPayload(job.getPayloadJson());
        List<CreatedAdminUserDto> createdUsers = createUsers(job.getId(), request);

        job.setStatus(AdminJobStatus.DONE);
        job.setFinishedAt(Instant.now());
        job.setResultSummary(String.format("Created %d test users", createdUsers.size()));
        job.setResultJson(writeResult(createdUsers));
        adminJobRepository.save(job);
    }

    @Transactional
    public void markJobFailed(long jobId, String errorMessage) {
        AdminJob job = adminJobRepository.findById(jobId)
            .orElseThrow(() -> ResourceNotFoundException.resource(com.rateit.backend.entity.types.Resource.ADMIN_JOB, jobId));
        job.setStatus(AdminJobStatus.FAILED);
        job.setFinishedAt(Instant.now());
        job.setErrorMessage(trimErrorMessage(errorMessage));
        adminJobRepository.save(job);
    }

    @Transactional(readOnly = true)
    public AdminJobDetailDto getJobDetail(long jobId) {
        AdminJob job = adminJobRepository.findById(jobId)
            .orElseThrow(() -> ResourceNotFoundException.resource(com.rateit.backend.entity.types.Resource.ADMIN_JOB, jobId));

        CreateUsersJobRequest request = readPayload(job.getPayloadJson());
        List<CreatedAdminUserDto> createdUsers = readCreatedUsers(job.getResultJson());
        return AdminJobDetailDto.fromJob(job, buildNarrative(job, request), request, createdUsers);
    }

    private List<CreatedAdminUserDto> createUsers(long jobId, CreateUsersJobRequest request) {
        return java.util.stream.IntStream.rangeClosed(1, request.count())
            .mapToObj(index -> {
                String username = String.format("%s_%d_%03d", request.usernamePrefix(), jobId, index);
                String phoneNumber = buildPhoneNumber(request.phonePrefix(), jobId, index);
                User createdUser = userService.create(phoneNumber, username, null, TEST_USER_ROLE);
                return CreatedAdminUserDto.fromUser(createdUser);
            })
            .collect(Collectors.toList());
    }

    private String buildNarrative(AdminJob job, CreateUsersJobRequest request) {
        return switch (job.getStatus()) {
            case PENDING -> String.format(
                "Queued to create %d test users with username prefix '%s' and phone prefix '%s'.",
                request.count(),
                request.usernamePrefix(),
                request.phonePrefix()
            );
            case IN_PROGRESS -> String.format(
                "Creating %d test users with username prefix '%s' and phone prefix '%s'.",
                request.count(),
                request.usernamePrefix(),
                request.phonePrefix()
            );
            case DONE -> {
                List<CreatedAdminUserDto> createdUsers = readCreatedUsers(job.getResultJson());
                if (createdUsers.isEmpty()) {
                    yield String.format("Completed creating %d test users.", request.count());
                }
                String createdUserSummary = createdUsers.stream()
                    .map(user -> user.username() + " (" + user.phoneNumber() + ")")
                    .collect(Collectors.joining(", "));
                yield String.format("Created %d test users: %s.", createdUsers.size(), createdUserSummary);
            }
            case FAILED -> "This job failed before completion.";
        };
    }

    private List<CreatedAdminUserDto> readCreatedUsers(String resultJson) {
        if (!StringUtils.hasText(resultJson)) {
            return List.of();
        }

        try {
            Map<?, ?> result = objectMapper.readValue(resultJson, Map.class);
            Object createdUsers = result.get("createdUsers");
            if (!(createdUsers instanceof List<?> rawUsers)) {
                return List.of();
            }

            return rawUsers.stream()
                .map(entry -> objectMapper.convertValue(entry, CreatedAdminUserDto.class))
                .toList();
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String writeResult(List<CreatedAdminUserDto> createdUsers) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                "createdUsers", createdUsers,
                "count", createdUsers.size()
            ));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize job result", ex);
        }
    }

    private CreateUsersJobRequest readPayload(String payloadJson) {
        try {
            return objectMapper.readValue(payloadJson, CreateUsersJobRequest.class);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse job payload", ex);
        }
    }

    private String writePayload(CreateUsersJobRequest request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize job payload", ex);
        }
    }

    private String normalizeUsernamePrefix(String usernamePrefix) {
        if (!StringUtils.hasText(usernamePrefix)) {
            return DEFAULT_USERNAME_PREFIX;
        }
        return usernamePrefix.trim().replaceAll("\\s+", "_");
    }

    private String normalizePhonePrefix(String phonePrefix) {
        if (!StringUtils.hasText(phonePrefix)) {
            return DEFAULT_PHONE_PREFIX;
        }

        String normalized = phonePrefix.trim().replaceAll("\\s+", "");
        if (!normalized.startsWith("+")) {
            normalized = "+" + normalized;
        }
        return normalized;
    }

    private String buildPhoneNumber(String phonePrefix, long jobId, int index) {
        return String.format("%s%04d%03d", phonePrefix, jobId % 10000, index);
    }

    private String trimErrorMessage(String errorMessage) {
        if (!StringUtils.hasText(errorMessage)) {
            return "Unknown error";
        }
        return errorMessage.length() > 1000 ? errorMessage.substring(0, 1000) : errorMessage;
    }
}
