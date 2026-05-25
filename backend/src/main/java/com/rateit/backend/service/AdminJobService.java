package com.rateit.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rateit.backend.entity.AdminJob;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.CreatedAdminPostDto;
import com.rateit.backend.entity.dto.AdminJobDetailDto;
import com.rateit.backend.entity.dto.AdminJobDto;
import com.rateit.backend.entity.dto.CreatedAdminUserDto;
import com.rateit.backend.entity.rest.CreatePostsJobRequest;
import com.rateit.backend.entity.rest.CreateUsersJobRequest;
import com.rateit.backend.entity.rest.CreateRatingRequest;
import com.rateit.backend.entity.types.UserRoles;
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
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminJobService {

    private static final String DEFAULT_PHONE_PREFIX = "+1555000";
    private static final String DEFAULT_USERNAME_PREFIX = "test_user";

    private final AdminJobRepository adminJobRepository;
    private final ObjectMapper objectMapper;
    private final UserService userService;
    private final FeedActionService feedActionService;

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

    @Transactional
    public AdminJobDto queueCreatePostsJob(CreatePostsJobRequest request) {
        int count = Math.max(1, request.count());
        String titlePrefix = normalizeOptionalPrefix(request.titlePrefix());
        String bodyPrefix = normalizeOptionalPrefix(request.bodyPrefix());
        String reviewPrefix = normalizeOptionalPrefix(request.reviewPrefix());

        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_POST)
            .status(AdminJobStatus.PENDING)
            .description(String.format("Create %d test posts", count))
            .payloadJson(writePayload(new CreatePostsJobRequest(count, titlePrefix, bodyPrefix, reviewPrefix)))
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

        CreateUsersJobRequest request = readUserPayload(job.getPayloadJson());
        List<CreatedAdminUserDto> createdUsers = createUsers(job.getId(), request);

        job.setStatus(AdminJobStatus.DONE);
        job.setFinishedAt(Instant.now());
        job.setResultSummary(String.format("Created %d test users", createdUsers.size()));
        job.setResultJson(writeUserResult(createdUsers));
        adminJobRepository.save(job);
    }

    @Transactional
    public void executeCreatePostsJob(long jobId) {
        AdminJob job = adminJobRepository.findById(jobId)
            .orElseThrow(() -> ResourceNotFoundException.resource(com.rateit.backend.entity.types.Resource.ADMIN_JOB, jobId));

        if (job.getJobType() != AdminJobType.CREATE_POST) {
            throw new IllegalStateException("Unsupported job type: " + job.getJobType());
        }

        CreatePostsJobRequest request = readPostPayload(job.getPayloadJson());
        List<CreatedAdminPostDto> createdPosts = createPosts(job.getId(), request);

        job.setStatus(AdminJobStatus.DONE);
        job.setFinishedAt(Instant.now());
        job.setResultSummary(String.format("Created %d test posts", createdPosts.size()));
        job.setResultJson(writePostResult(createdPosts));
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

        CreateUsersJobRequest request = readUserPayload(job.getPayloadJson());
        List<CreatedAdminUserDto> createdUsers = readCreatedUsers(job.getResultJson());
        CreatePostsJobRequest createPostsRequest = readPostPayload(job.getPayloadJson());
        List<CreatedAdminPostDto> createdPosts = readCreatedPosts(job.getResultJson());
        return switch (job.getJobType()) {
            case CREATE_USER -> AdminJobDetailDto.fromJob(
                job,
                buildUserNarrative(job, request),
                request,
                createdUsers,
                null,
                List.of()
            );
            case CREATE_POST -> AdminJobDetailDto.fromJob(
                job,
                buildPostNarrative(job, createPostsRequest),
                null,
                List.of(),
                createPostsRequest,
                createdPosts
            );
        };
    }

    private List<CreatedAdminUserDto> createUsers(long jobId, CreateUsersJobRequest request) {
        return java.util.stream.IntStream.rangeClosed(1, request.count())
            .mapToObj(index -> {
                String username = String.format("%s_%d_%03d", request.usernamePrefix(), jobId, index);
                String phoneNumber = buildPhoneNumber(request.phonePrefix(), jobId, index);
                User createdUser = userService.create(phoneNumber, username, null, UserRoles.TEST_USER);
                return CreatedAdminUserDto.fromUser(createdUser);
            })
            .collect(Collectors.toList());
    }

    private List<CreatedAdminPostDto> createPosts(long jobId, CreatePostsJobRequest request) {
        List<User> testUsers = new ArrayList<>(userService.findAllTestUsers());
        if (testUsers.isEmpty()) {
            throw new IllegalStateException("No active test users are available to author posts");
        }

        Random random = new Random(jobId);
        List<BigDecimal> scores = List.of(
            new BigDecimal("1"),
            new BigDecimal("1.5"),
            new BigDecimal("2"),
            new BigDecimal("2.5"),
            new BigDecimal("3"),
            new BigDecimal("3.5"),
            new BigDecimal("4"),
            new BigDecimal("4.5"),
            new BigDecimal("5")
        );

        List<CreatedAdminPostDto> createdPosts = new ArrayList<>();
        for (int index = 1; index <= request.count(); index++) {
            User author = testUsers.get(random.nextInt(testUsers.size()));
            CreateRatingRequest createRequest = new CreateRatingRequest(
                buildTitle(request.titlePrefix(), random),
                buildBody(request.bodyPrefix(), random),
                buildReviewText(request.reviewPrefix(), random),
                scores.get(random.nextInt(scores.size())),
                null,
                null
            );

            var created = feedActionService.createRating(createRequest, author.getPhoneNumber());
            createdPosts.add(CreatedAdminPostDto.fromFeedItem(created, author));
        }

        return createdPosts;
    }

    private String buildUserNarrative(AdminJob job, CreateUsersJobRequest request) {
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

    private String buildPostNarrative(AdminJob job, CreatePostsJobRequest request) {
        return switch (job.getStatus()) {
            case PENDING -> String.format(
                "Queued to create %d test posts using active test users as authors.",
                request.count()
            );
            case IN_PROGRESS -> String.format(
                "Creating %d test posts using active test users as authors.",
                request.count()
            );
            case DONE -> {
                List<CreatedAdminPostDto> createdPosts = readCreatedPosts(job.getResultJson());
                if (createdPosts.isEmpty()) {
                    yield String.format("Completed creating %d test posts.", request.count());
                }
                String createdPostSummary = createdPosts.stream()
                    .map(post -> post.title() + " by " + post.authorUsername())
                    .collect(Collectors.joining(", "));
                yield String.format("Created %d test posts: %s.", createdPosts.size(), createdPostSummary);
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

    private List<CreatedAdminPostDto> readCreatedPosts(String resultJson) {
        if (!StringUtils.hasText(resultJson)) {
            return List.of();
        }

        try {
            Map<?, ?> result = objectMapper.readValue(resultJson, Map.class);
            Object createdPosts = result.get("createdPosts");
            if (!(createdPosts instanceof List<?> rawPosts)) {
                return List.of();
            }

            return rawPosts.stream()
                .map(entry -> objectMapper.convertValue(entry, CreatedAdminPostDto.class))
                .toList();
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String writeUserResult(List<CreatedAdminUserDto> createdUsers) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                "createdUsers", createdUsers,
                "count", createdUsers.size()
            ));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize job result", ex);
        }
    }

    private String writePostResult(List<CreatedAdminPostDto> createdPosts) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                "createdPosts", createdPosts,
                "count", createdPosts.size()
            ));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize job result", ex);
        }
    }

    private CreateUsersJobRequest readUserPayload(String payloadJson) {
        if (!StringUtils.hasText(payloadJson)) {
            return null;
        }
        try {
            return objectMapper.readValue(payloadJson, CreateUsersJobRequest.class);
        } catch (Exception ex) {
            return null;
        }
    }

    private CreatePostsJobRequest readPostPayload(String payloadJson) {
        if (!StringUtils.hasText(payloadJson)) {
            return null;
        }
        try {
            return objectMapper.readValue(payloadJson, CreatePostsJobRequest.class);
        } catch (Exception ex) {
            return null;
        }
    }

    private String writePayload(CreateUsersJobRequest request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize job payload", ex);
        }
    }

    private String writePayload(CreatePostsJobRequest request) {
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

    private String normalizeOptionalPrefix(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim().replaceAll("\\s+", "_");
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

    private String buildTitle(String prefix, Random random) {
        List<String> titles = List.of(
            "Worth a look",
            "Better than expected",
            "Pretty solid overall",
            "A decent pick",
            "Surprisingly good",
            "Not my favorite, but fine",
            "A small win",
            "Would try again"
        );
        return applyPrefix(prefix, titles.get(random.nextInt(titles.size())));
    }

    private String buildBody(String prefix, Random random) {
        List<String> bodies = List.of(
            "I spent some time with this and it held up pretty well.",
            "The first impression was good and it stayed that way.",
            "It worked out better than I expected.",
            "Not perfect, but it did the job without drama.",
            "I would put this in the solid-but-not-exciting category.",
            "This was easy to use and didn't get in the way.",
            "I kept coming back to it because it was reliable.",
            "It felt balanced and straightforward."
        );
        return applyPrefix(prefix, bodies.get(random.nextInt(bodies.size())));
    }

    private String buildReviewText(String prefix, Random random) {
        List<String> reviews = List.of(
            "Good enough to recommend.",
            "Worth a second look.",
            "A simple win.",
            "Nothing flashy, just solid.",
            "Pleasantly surprised by it.",
            "Could be better, but still decent.",
            "Happy with the result.",
            "Would use again."
        );
        return applyPrefix(prefix, reviews.get(random.nextInt(reviews.size())));
    }

    private String applyPrefix(String prefix, String value) {
        if (!StringUtils.hasText(prefix)) {
            return value;
        }
        return prefix.trim() + " " + value;
    }
}
