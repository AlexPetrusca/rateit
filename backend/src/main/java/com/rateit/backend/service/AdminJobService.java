package com.rateit.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rateit.backend.entity.AdminJob;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingLike;
import com.rateit.backend.entity.dto.CreatedAdminPostDto;
import com.rateit.backend.entity.dto.CreatedAdminCommentDto;
import com.rateit.backend.entity.dto.CreatedAdminLikeDto;
import com.rateit.backend.entity.dto.AdminJobDetailDto;
import com.rateit.backend.entity.dto.AdminJobDto;
import com.rateit.backend.entity.dto.CreatedAdminUserDto;
import com.rateit.backend.entity.dto.RatingCommentDto;
import com.rateit.backend.entity.rest.CreateCommentsJobRequest;
import com.rateit.backend.entity.rest.CreateLikesJobRequest;
import com.rateit.backend.entity.rest.CreatePostsJobRequest;
import com.rateit.backend.entity.rest.CreateUsersJobRequest;
import com.rateit.backend.entity.rest.CreateRatingCommentRequest;
import com.rateit.backend.entity.rest.CreateRatingRequest;
import com.rateit.backend.entity.types.UserRoles;
import com.rateit.backend.entity.types.AdminJobStatus;
import com.rateit.backend.entity.types.AdminJobType;
import com.rateit.backend.entity.types.Visibility;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.repository.AdminJobRepository;
import com.rateit.backend.repository.RatingLikeRepository;
import com.rateit.backend.repository.RatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
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
    private final RatingRepository ratingRepository;
    private final RatingLikeRepository ratingLikeRepository;

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
        String bodyPrefix = normalizeOptionalPrefix(request.bodyPrefix());
        String reviewPrefix = normalizeOptionalPrefix(request.reviewPrefix());

        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_POST)
            .status(AdminJobStatus.PENDING)
            .description(String.format("Create %d test posts", count))
            .payloadJson(writePayload(new CreatePostsJobRequest(count, bodyPrefix, reviewPrefix)))
            .build();

        return AdminJobDto.fromJob(adminJobRepository.save(job));
    }

    @Transactional
    public AdminJobDto queueCreateCommentsJob(CreateCommentsJobRequest request) {
        int count = Math.max(1, request.count());
        int maxDepth = Math.max(1, request.maxDepth());
        double replyChance = clampReplyChance(request.replyChance());
        String commentPrefix = normalizeOptionalPrefix(request.commentPrefix());
        String replyPrefix = normalizeOptionalPrefix(request.replyPrefix());

        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_COMMENT)
            .status(AdminJobStatus.PENDING)
            .description(String.format("Create %d test comments", count))
            .payloadJson(writePayload(new CreateCommentsJobRequest(count, maxDepth, replyChance, commentPrefix, replyPrefix)))
            .build();

        return AdminJobDto.fromJob(adminJobRepository.save(job));
    }

    @Transactional
    public AdminJobDto queueCreateLikesJob(CreateLikesJobRequest request) {
        int count = Math.max(1, request.count());

        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_LIKE)
            .status(AdminJobStatus.PENDING)
            .description(String.format("Create %d test likes", count))
            .payloadJson(writePayload(new CreateLikesJobRequest(count)))
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
    public void executeCreateCommentsJob(long jobId) {
        AdminJob job = adminJobRepository.findById(jobId)
            .orElseThrow(() -> ResourceNotFoundException.resource(com.rateit.backend.entity.types.Resource.ADMIN_JOB, jobId));

        if (job.getJobType() != AdminJobType.CREATE_COMMENT) {
            throw new IllegalStateException("Unsupported job type: " + job.getJobType());
        }

        CreateCommentsJobRequest request = readCommentPayload(job.getPayloadJson());
        List<CreatedAdminCommentDto> createdComments = createComments(job.getId(), request);

        job.setStatus(AdminJobStatus.DONE);
        job.setFinishedAt(Instant.now());
        job.setResultSummary(String.format("Created %d test comments", createdComments.size()));
        job.setResultJson(writeCommentResult(createdComments));
        adminJobRepository.save(job);
    }

    @Transactional
    public void executeCreateLikesJob(long jobId) {
        AdminJob job = adminJobRepository.findById(jobId)
            .orElseThrow(() -> ResourceNotFoundException.resource(com.rateit.backend.entity.types.Resource.ADMIN_JOB, jobId));

        if (job.getJobType() != AdminJobType.CREATE_LIKE) {
            throw new IllegalStateException("Unsupported job type: " + job.getJobType());
        }

        CreateLikesJobRequest request = readLikePayload(job.getPayloadJson());
        List<CreatedAdminLikeDto> createdLikes = createLikes(job.getId(), request);

        job.setStatus(AdminJobStatus.DONE);
        job.setFinishedAt(Instant.now());
        job.setResultSummary(String.format("Created %d test likes", createdLikes.size()));
        job.setResultJson(writeLikeResult(createdLikes));
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
        CreateCommentsJobRequest createCommentsRequest = readCommentPayload(job.getPayloadJson());
        List<CreatedAdminCommentDto> createdComments = readCreatedComments(job.getResultJson());
        CreateLikesJobRequest createLikesRequest = readLikePayload(job.getPayloadJson());
        List<CreatedAdminLikeDto> createdLikes = readCreatedLikes(job.getResultJson());
        return switch (job.getJobType()) {
            case CREATE_USER -> AdminJobDetailDto.fromJob(
                job,
                buildUserNarrative(job, request),
                request,
                createdUsers,
                null,
                List.of(),
                null,
                List.of(),
                null,
                List.of()
            );
            case CREATE_POST -> AdminJobDetailDto.fromJob(
                job,
                buildPostNarrative(job, createPostsRequest),
                null,
                List.of(),
                createPostsRequest,
                createdPosts,
                null,
                List.of(),
                null,
                List.of()
            );
            case CREATE_COMMENT -> AdminJobDetailDto.fromJob(
                job,
                buildCommentNarrative(job, createCommentsRequest),
                null,
                List.of(),
                null,
                List.of(),
                createCommentsRequest,
                createdComments,
                null,
                List.of()
            );
            case CREATE_LIKE -> AdminJobDetailDto.fromJob(
                job,
                buildLikeNarrative(job, createLikesRequest),
                null,
                List.of(),
                null,
                List.of(),
                null,
                List.of(),
                createLikesRequest,
                createdLikes
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
            new BigDecimal("0.5"),
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

    private List<CreatedAdminCommentDto> createComments(long jobId, CreateCommentsJobRequest request) {
        List<User> testUsers = new ArrayList<>(userService.findAllTestUsers());
        if (testUsers.isEmpty()) {
            throw new IllegalStateException("No active test users are available to author comments");
        }

        List<Rating> ratings = ratingRepository.findRecentByVisibility(Visibility.PUBLIC, PageRequest.of(0, 100));
        if (ratings.isEmpty()) {
            throw new IllegalStateException("No public posts are available for comment generation");
        }

        Random random = new Random(jobId);
        List<BigDecimal> scores = List.of(
            new BigDecimal("0.5"),
            new BigDecimal("1.5"),
            new BigDecimal("2"),
            new BigDecimal("2.5"),
            new BigDecimal("3"),
            new BigDecimal("3.5"),
            new BigDecimal("4"),
            new BigDecimal("4.5"),
            new BigDecimal("5")
        );

        Map<Long, List<CommentNode>> commentsByRating = new HashMap<>();
        List<CreatedAdminCommentDto> createdComments = new ArrayList<>();

        for (int index = 1; index <= request.count(); index++) {
            Rating targetRating = ratings.get(random.nextInt(ratings.size()));
            List<CommentNode> thread = commentsByRating.computeIfAbsent(targetRating.getId(), key -> new ArrayList<>());

            CommentNode parentNode = null;
            boolean canReply = !thread.isEmpty() && request.maxDepth() > 1;
            if (canReply && random.nextDouble() < request.replyChance()) {
                List<CommentNode> replyTargets = thread.stream()
                    .filter(candidate -> candidate.depth < request.maxDepth())
                    .toList();
                if (!replyTargets.isEmpty()) {
                    parentNode = replyTargets.get(random.nextInt(replyTargets.size()));
                }
            }

            User author = testUsers.get(random.nextInt(testUsers.size()));
            String prefix = parentNode == null ? request.commentPrefix() : request.replyPrefix();
            String text = buildCommentText(prefix, random, parentNode != null);
            BigDecimal score = scores.get(random.nextInt(scores.size()));

            RatingCommentDto createdComment = feedActionService.createComment(
                targetRating.getId(),
                new CreateRatingCommentRequest(text, score, parentNode == null ? null : parentNode.commentId()),
                author.getPhoneNumber()
            );

            CommentNode createdNode = new CommentNode(createdComment.id(), createdComment.parentCommentId(), parentNode == null ? 1 : parentNode.depth() + 1);
            thread.add(createdNode);
            createdComments.add(CreatedAdminCommentDto.fromComment(createdComment, author));
        }

        return createdComments;
    }

    private List<CreatedAdminLikeDto> createLikes(long jobId, CreateLikesJobRequest request) {
        List<User> testUsers = new ArrayList<>(userService.findAllTestUsers());
        if (testUsers.isEmpty()) {
            throw new IllegalStateException("No active test users are available to like posts");
        }

        List<Rating> ratings = ratingRepository.findRecentByVisibility(Visibility.PUBLIC, PageRequest.of(0, 100));
        if (ratings.isEmpty()) {
            throw new IllegalStateException("No public posts are available for like generation");
        }

        Random random = new Random(jobId);
        List<CreatedAdminLikeDto> createdLikes = new ArrayList<>();
        int attempts = 0;
        int maxAttempts = Math.max(request.count() * 10, 50);

        while (createdLikes.size() < request.count() && attempts < maxAttempts) {
            attempts++;
            User author = testUsers.get(random.nextInt(testUsers.size()));
            Rating targetRating = ratings.get(random.nextInt(ratings.size()));

            if (ratingLikeRepository.existsByRatingAndUser(targetRating, author)) {
                continue;
            }

            feedActionService.likeRating(targetRating.getId(), author.getPhoneNumber());
            RatingLike createdLike = ratingLikeRepository.findByRatingAndUser(targetRating, author)
                .orElseThrow(() -> new IllegalStateException("Failed to persist like"));
            createdLikes.add(CreatedAdminLikeDto.fromUser(createdLike.getId(), targetRating.getId(), author, createdLike.getCreatedAt()));
        }

        if (createdLikes.size() < request.count()) {
            throw new IllegalStateException(String.format(
                "Only created %d of %d requested likes",
                createdLikes.size(),
                request.count()
            ));
        }

        return createdLikes;
    }

    private String buildUserNarrative(AdminJob job, CreateUsersJobRequest request) {
        int count = request != null ? request.count() : 0;
        String usernamePrefix = request != null ? request.usernamePrefix() : DEFAULT_USERNAME_PREFIX;
        String phonePrefix = request != null ? request.phonePrefix() : DEFAULT_PHONE_PREFIX;

        return switch (job.getStatus()) {
            case PENDING -> String.format(
                "Queued to create %d test users with username prefix '%s' and phone prefix '%s'.",
                count,
                usernamePrefix,
                phonePrefix
            );
            case IN_PROGRESS -> String.format(
                "Creating %d test users with username prefix '%s' and phone prefix '%s'.",
                count,
                usernamePrefix,
                phonePrefix
            );
            case DONE -> {
                List<CreatedAdminUserDto> createdUsers = readCreatedUsers(job.getResultJson());
                if (createdUsers.isEmpty()) {
                    yield String.format("Completed creating %d test users.", count);
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
        int count = request != null ? request.count() : 0;

        return switch (job.getStatus()) {
            case PENDING -> String.format(
                "Queued to create %d test posts using active test users as authors.",
                count
            );
            case IN_PROGRESS -> String.format(
                "Creating %d test posts using active test users as authors.",
                count
            );
            case DONE -> {
                List<CreatedAdminPostDto> createdPosts = readCreatedPosts(job.getResultJson());
                if (createdPosts.isEmpty()) {
                    yield String.format("Completed creating %d test posts.", count);
                }
                String createdPostSummary = createdPosts.stream()
                    .map(post -> post.body() + " by " + post.authorUsername())
                    .collect(Collectors.joining(", "));
                yield String.format("Created %d test posts: %s.", createdPosts.size(), createdPostSummary);
            }
            case FAILED -> "This job failed before completion.";
        };
    }

    private String buildCommentNarrative(AdminJob job, CreateCommentsJobRequest request) {
        int count = request != null ? request.count() : 0;
        int maxDepth = request != null ? request.maxDepth() : 1;
        double replyChance = request != null ? request.replyChance() : 0.0;

        return switch (job.getStatus()) {
            case PENDING -> String.format(
                "Queued to create %d test comments using active test users, with up to %d levels of threading and a %.0f%% reply chance.",
                count,
                maxDepth,
                replyChance * 100
            );
            case IN_PROGRESS -> String.format(
                "Creating %d test comments using active test users, with up to %d levels of threading.",
                count,
                maxDepth
            );
            case DONE -> {
                List<CreatedAdminCommentDto> createdComments = readCreatedComments(job.getResultJson());
                if (createdComments.isEmpty()) {
                    yield String.format("Completed creating %d test comments.", count);
                }
                String createdCommentSummary = createdComments.stream()
                    .limit(5)
                    .map(comment -> String.format(
                        "%s%s%s",
                        comment.parentCommentId() == null ? "root" : "reply",
                        comment.parentCommentId() == null ? "" : " to #" + comment.parentCommentId(),
                        " by " + comment.authorUsername()
                    ))
                    .collect(Collectors.joining(", "));
                yield String.format("Created %d test comments%s.",
                    createdComments.size(),
                    createdCommentSummary.isEmpty() ? "" : ": " + createdCommentSummary
                );
            }
            case FAILED -> "This job failed before completion.";
        };
    }

    private String buildLikeNarrative(AdminJob job, CreateLikesJobRequest request) {
        int count = request != null ? request.count() : 0;

        return switch (job.getStatus()) {
            case PENDING -> String.format(
                "Queued to create %d test likes using active test users and public posts.",
                count
            );
            case IN_PROGRESS -> String.format(
                "Creating %d test likes using active test users and public posts.",
                count
            );
            case DONE -> {
                List<CreatedAdminLikeDto> createdLikes = readCreatedLikes(job.getResultJson());
                if (createdLikes.isEmpty()) {
                    yield String.format("Completed creating %d test likes.", count);
                }
                String createdLikeSummary = createdLikes.stream()
                    .limit(5)
                    .map(like -> String.format("%s on #%d", like.authorUsername(), like.ratingId()))
                    .collect(Collectors.joining(", "));
                yield String.format("Created %d test likes: %s.", createdLikes.size(), createdLikeSummary);
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

    private List<CreatedAdminCommentDto> readCreatedComments(String resultJson) {
        if (!StringUtils.hasText(resultJson)) {
            return List.of();
        }

        try {
            Map<?, ?> result = objectMapper.readValue(resultJson, Map.class);
            Object createdComments = result.get("createdComments");
            if (!(createdComments instanceof List<?> rawComments)) {
                return List.of();
            }

            return rawComments.stream()
                .map(entry -> objectMapper.convertValue(entry, CreatedAdminCommentDto.class))
                .toList();
        } catch (Exception ex) {
            return List.of();
        }
    }

    private List<CreatedAdminLikeDto> readCreatedLikes(String resultJson) {
        if (!StringUtils.hasText(resultJson)) {
            return List.of();
        }

        try {
            Map<?, ?> result = objectMapper.readValue(resultJson, Map.class);
            Object createdLikes = result.get("createdLikes");
            if (!(createdLikes instanceof List<?> rawLikes)) {
                return List.of();
            }

            return rawLikes.stream()
                .map(entry -> objectMapper.convertValue(entry, CreatedAdminLikeDto.class))
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

    private String writeCommentResult(List<CreatedAdminCommentDto> createdComments) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                "createdComments", createdComments,
                "count", createdComments.size()
            ));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize job result", ex);
        }
    }

    private String writeLikeResult(List<CreatedAdminLikeDto> createdLikes) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                "createdLikes", createdLikes,
                "count", createdLikes.size()
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

    private CreateCommentsJobRequest readCommentPayload(String payloadJson) {
        if (!StringUtils.hasText(payloadJson)) {
            return null;
        }
        try {
            return objectMapper.readValue(payloadJson, CreateCommentsJobRequest.class);
        } catch (Exception ex) {
            return null;
        }
    }

    private CreateLikesJobRequest readLikePayload(String payloadJson) {
        if (!StringUtils.hasText(payloadJson)) {
            return null;
        }
        try {
            return objectMapper.readValue(payloadJson, CreateLikesJobRequest.class);
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

    private String writePayload(CreateCommentsJobRequest request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize job payload", ex);
        }
    }

    private String writePayload(CreateLikesJobRequest request) {
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

    private double clampReplyChance(double replyChance) {
        if (Double.isNaN(replyChance) || Double.isInfinite(replyChance)) {
            return 0.5d;
        }

        return Math.max(0d, Math.min(1d, replyChance));
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

    private String buildCommentText(String prefix, Random random, boolean isReply) {
        List<String> roots = List.of(
            "I gave this a try and had a clear impression.",
            "I spent a little time with it and noted what stood out.",
            "I kept coming back to it because it was reliable.",
            "I wanted to see how it would hold up over a few days.",
            "I tried it in a couple of different situations.",
            "I paid attention to the details and it was easy to judge.",
            "I took a straightforward approach and it was pretty consistent.",
            "I used it enough to feel confident about the result."
        );
        List<String> replies = List.of(
            "That matched my experience too.",
            "I saw the same thing on my end.",
            "That was the part that stood out to me as well.",
            "I went in a different direction and got a similar result.",
            "That was basically my read on it too.",
            "I had the same takeaway after using it.",
            "That's the bit that made it click for me.",
            "I got to the same conclusion after a few tries."
        );

        String body = (isReply ? replies : roots).get(random.nextInt(isReply ? replies.size() : roots.size()));
        return applyPrefix(prefix, body);
    }

    private String buildBody(String prefix, Random random) {
        List<String> bodies = List.of(
            "I tried it after work and had a good sense of how it held up.",
            "I used it for a couple of days to see what it was like.",
            "I took it with me for a quick test run over the weekend.",
            "I gave it a fair shot and paid attention to the details.",
            "I spent some time with it and noted what stood out.",
            "I started with a simple use case and built from there.",
            "I kept it in rotation long enough to get a clear read on it.",
            "I went in expecting a basic result and checked how it performed."
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

    private record CommentNode(Long commentId, Long parentCommentId, int depth) {}
}
