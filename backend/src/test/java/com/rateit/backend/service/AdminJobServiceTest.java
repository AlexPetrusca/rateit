package com.rateit.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rateit.backend.entity.AdminJob;
import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingLike;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.FeedItemDto;
import com.rateit.backend.entity.dto.AdminJobDetailDto;
import com.rateit.backend.entity.dto.RatingCommentDto;
import com.rateit.backend.entity.rest.CreateCommentsJobRequest;
import com.rateit.backend.entity.rest.CreateLikesJobRequest;
import com.rateit.backend.entity.rest.CreatePostsJobRequest;
import com.rateit.backend.entity.rest.CreateUsersJobRequest;
import com.rateit.backend.entity.types.AdminJobStatus;
import com.rateit.backend.entity.types.AdminJobType;
import com.rateit.backend.entity.types.Visibility;
import com.rateit.backend.repository.AdminJobRepository;
import com.rateit.backend.repository.RatingLikeRepository;
import com.rateit.backend.repository.RatingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class AdminJobServiceTest {

    @Mock
    private AdminJobRepository adminJobRepository;

    @Mock
    private UserService userService;

    @Mock
    private FeedActionService feedActionService;

    @Mock
    private RatingRepository ratingRepository;

    @Mock
    private RatingLikeRepository ratingLikeRepository;

    private AdminJobService adminJobService;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        adminJobService = new AdminJobService(
            adminJobRepository,
            objectMapper,
            userService,
            feedActionService,
            ratingRepository,
            ratingLikeRepository
        );
    }

    @Test
    void queueCreateUsersJobStoresPendingJobWithTestUserRolePayload() {
        when(adminJobRepository.save(any(AdminJob.class))).thenAnswer(invocation -> {
            AdminJob job = invocation.getArgument(0);
            ReflectionTestUtils.setField(job, "id", 7L);
            return job;
        });

        var dto = adminJobService.queueCreateUsersJob(new CreateUsersJobRequest(3, "alpha", "+1555000"));

        ArgumentCaptor<AdminJob> jobCaptor = ArgumentCaptor.forClass(AdminJob.class);
        verify(adminJobRepository).save(jobCaptor.capture());

        AdminJob savedJob = jobCaptor.getValue();
        assertEquals(AdminJobType.CREATE_USER, savedJob.getJobType());
        assertEquals(AdminJobStatus.PENDING, savedJob.getStatus());
        assertEquals("Create 3 test users", savedJob.getDescription());
        assertTrue(savedJob.getPayloadJson().contains("\"usernamePrefix\":\"alpha\""));
        assertTrue(savedJob.getPayloadJson().contains("\"phonePrefix\":\"+1555000\""));
        assertEquals(7L, dto.id());
        assertEquals(AdminJobStatus.PENDING, dto.status());
    }

    @Test
    void queueCreatePostsJobStoresPendingJobWithPostPayload() {
        when(adminJobRepository.save(any(AdminJob.class))).thenAnswer(invocation -> {
            AdminJob job = invocation.getArgument(0);
            ReflectionTestUtils.setField(job, "id", 8L);
            return job;
        });

        var dto = adminJobService.queueCreatePostsJob(new CreatePostsJobRequest(4, "body", "review"));

        ArgumentCaptor<AdminJob> jobCaptor = ArgumentCaptor.forClass(AdminJob.class);
        verify(adminJobRepository).save(jobCaptor.capture());

        AdminJob savedJob = jobCaptor.getValue();
        assertEquals(AdminJobType.CREATE_POST, savedJob.getJobType());
        assertEquals(AdminJobStatus.PENDING, savedJob.getStatus());
        assertEquals("Create 4 test posts", savedJob.getDescription());
        assertTrue(savedJob.getPayloadJson().contains("\"bodyPrefix\":\"body\""));
        assertTrue(savedJob.getPayloadJson().contains("\"reviewPrefix\":\"review\""));
        assertEquals(8L, dto.id());
        assertEquals(AdminJobStatus.PENDING, dto.status());
    }

    @Test
    void queueCreateCommentsJobStoresPendingJobWithCommentPayload() {
        when(adminJobRepository.save(any(AdminJob.class))).thenAnswer(invocation -> {
            AdminJob job = invocation.getArgument(0);
            ReflectionTestUtils.setField(job, "id", 9L);
            return job;
        });

        var dto = adminJobService.queueCreateCommentsJob(new CreateCommentsJobRequest(6, 3, 0.5, "comment", "reply"));

        ArgumentCaptor<AdminJob> jobCaptor = ArgumentCaptor.forClass(AdminJob.class);
        verify(adminJobRepository).save(jobCaptor.capture());

        AdminJob savedJob = jobCaptor.getValue();
        assertEquals(AdminJobType.CREATE_COMMENT, savedJob.getJobType());
        assertEquals(AdminJobStatus.PENDING, savedJob.getStatus());
        assertEquals("Create 6 test comments", savedJob.getDescription());
        assertTrue(savedJob.getPayloadJson().contains("\"maxDepth\":3"));
        assertTrue(savedJob.getPayloadJson().contains("\"replyChance\":0.5"));
        assertTrue(savedJob.getPayloadJson().contains("\"commentPrefix\":\"comment\""));
        assertTrue(savedJob.getPayloadJson().contains("\"replyPrefix\":\"reply\""));
        assertEquals(9L, dto.id());
        assertEquals(AdminJobStatus.PENDING, dto.status());
    }

    @Test
    void queueCreateLikesJobStoresPendingJobWithLikePayload() {
        when(adminJobRepository.save(any(AdminJob.class))).thenAnswer(invocation -> {
            AdminJob job = invocation.getArgument(0);
            ReflectionTestUtils.setField(job, "id", 10L);
            return job;
        });

        var dto = adminJobService.queueCreateLikesJob(new CreateLikesJobRequest(8));

        ArgumentCaptor<AdminJob> jobCaptor = ArgumentCaptor.forClass(AdminJob.class);
        verify(adminJobRepository).save(jobCaptor.capture());

        AdminJob savedJob = jobCaptor.getValue();
        assertEquals(AdminJobType.CREATE_LIKE, savedJob.getJobType());
        assertEquals(AdminJobStatus.PENDING, savedJob.getStatus());
        assertEquals("Create 8 test likes", savedJob.getDescription());
        assertTrue(savedJob.getPayloadJson().contains("\"count\":8"));
        assertEquals(10L, dto.id());
        assertEquals(AdminJobStatus.PENDING, dto.status());
    }

    @Test
    void executeCreateUsersJobCreatesUsersWithTestRole() {
        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_USER)
            .status(AdminJobStatus.IN_PROGRESS)
            .description("Create 2 test users")
            .payloadJson("{\"count\":2,\"usernamePrefix\":\"alpha\",\"phonePrefix\":\"+1555000\"}")
            .build();
        ReflectionTestUtils.setField(job, "id", 11L);

        when(adminJobRepository.findById(11L)).thenReturn(Optional.of(job));
        when(adminJobRepository.save(any(AdminJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(userService.create(any(), any(), any(), any())).thenAnswer(invocation -> {
            String phoneNumber = invocation.getArgument(0);
            String username = invocation.getArgument(1);
            String role = invocation.getArgument(3);
            User createdUser = User.builder()
                .phoneNumber(phoneNumber)
                .username(username)
                .role(role)
                .build();
            ReflectionTestUtils.setField(createdUser, "id", (long) (phoneNumber.hashCode() & Integer.MAX_VALUE));
            return createdUser;
        });

        adminJobService.executeCreateUsersJob(11L);

        verify(userService).create("+15550000011001", "alpha_11_001", null, "ROLE_TEST_USER");
        verify(userService).create("+15550000011002", "alpha_11_002", null, "ROLE_TEST_USER");
        assertEquals(AdminJobStatus.DONE, job.getStatus());
        assertEquals("Created 2 test users", job.getResultSummary());
        assertTrue(job.getResultJson().contains("\"username\":\"alpha_11_001\""));
        assertTrue(job.getResultJson().contains("\"username\":\"alpha_11_002\""));
    }

    @Test
    void executeCreatePostsJobCreatesPostsWithTestAuthors() {
        User authorA = User.builder()
            .phoneNumber("+15550000001")
            .username("alpha")
            .role("ROLE_TEST_USER")
            .build();
        ReflectionTestUtils.setField(authorA, "id", 1L);
        User authorB = User.builder()
            .phoneNumber("+15550000002")
            .username("beta")
            .role("ROLE_TEST_USER")
            .build();
        ReflectionTestUtils.setField(authorB, "id", 2L);

        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_POST)
            .status(AdminJobStatus.IN_PROGRESS)
            .description("Create 2 test posts")
            .payloadJson("{\"count\":2,\"bodyPrefix\":\"body\",\"reviewPrefix\":\"review\"}")
            .build();
        ReflectionTestUtils.setField(job, "id", 12L);

        when(adminJobRepository.findById(12L)).thenReturn(Optional.of(job));
        when(adminJobRepository.save(any(AdminJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userService.findAllTestUsers()).thenReturn(List.of(authorA, authorB));
        when(feedActionService.createRating(any(), any())).thenAnswer(invocation -> {
            String phoneNumber = invocation.getArgument(1);
            User author = phoneNumber.equals(authorA.getPhoneNumber()) ? authorA : authorB;
            FeedItemDto dto = new FeedItemDto(
                (long) (phoneNumber.hashCode() & Integer.MAX_VALUE),
                new BigDecimal("4.5"),
                "review text",
                java.time.Instant.parse("2025-01-01T00:00:00Z"),
                0L,
                0L,
                false,
                false,
                new FeedItemDto.Author(author.getId(), author.getUsername(), null),
                new FeedItemDto.Item(99L, com.rateit.backend.entity.types.RateableItemType.TEXT_POST, "A body", null, 0L),
                new FeedItemDto.Scale("5 stars", "star", BigDecimal.ONE, new BigDecimal("5"))
            );
            return dto;
        });

        adminJobService.executeCreatePostsJob(12L);

        verify(feedActionService, times(2)).createRating(any(), any());
        assertEquals(AdminJobStatus.DONE, job.getStatus());
        assertEquals("Created 2 test posts", job.getResultSummary());
        assertTrue(job.getResultJson().contains("\"createdPosts\""));
    }

    @Test
    void executeCreateCommentsJobCreatesThreadedComments() {
        User authorA = User.builder()
            .phoneNumber("+15550000001")
            .username("alpha")
            .role("ROLE_TEST_USER")
            .build();
        ReflectionTestUtils.setField(authorA, "id", 1L);
        User authorB = User.builder()
            .phoneNumber("+15550000002")
            .username("beta")
            .role("ROLE_TEST_USER")
            .build();
        ReflectionTestUtils.setField(authorB, "id", 2L);

        Rating rating = Rating.builder()
            .score(new BigDecimal("4.5"))
            .reviewText("review")
            .visibility(Visibility.PUBLIC)
            .build();
        ReflectionTestUtils.setField(rating, "id", 99L);

        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_COMMENT)
            .status(AdminJobStatus.IN_PROGRESS)
            .description("Create 3 test comments")
            .payloadJson("{\"count\":3,\"maxDepth\":3,\"replyChance\":1.0,\"commentPrefix\":\"comment\",\"replyPrefix\":\"reply\"}")
            .build();
        ReflectionTestUtils.setField(job, "id", 13L);

        when(adminJobRepository.findById(13L)).thenReturn(Optional.of(job));
        when(adminJobRepository.save(any(AdminJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userService.findAllTestUsers()).thenReturn(List.of(authorA, authorB));
        when(ratingRepository.findRecentByVisibility(any(), any())).thenReturn(List.of(rating));
        when(feedActionService.createComment(any(), any(), any())).thenAnswer(invocation -> {
            var request = invocation.getArgument(1, com.rateit.backend.entity.rest.CreateRatingCommentRequest.class);
            Long parentCommentId = request.parentCommentId();
            long commentId = parentCommentId == null ? 100L : 200L;
            return new RatingCommentDto(
                commentId,
                rating.getId(),
                parentCommentId,
                request.text(),
                request.score(),
                Instant.parse("2025-01-01T00:00:00Z"),
                0L,
                false,
                new RatingCommentDto.Author(
                    parentCommentId == null ? authorA.getId() : authorB.getId(),
                    parentCommentId == null ? authorA.getUsername() : authorB.getUsername(),
                    null
                ),
                List.of()
            );
        });

        adminJobService.executeCreateCommentsJob(13L);

        assertEquals(AdminJobStatus.DONE, job.getStatus());
        assertEquals("Created 3 test comments", job.getResultSummary());
        assertTrue(job.getResultJson().contains("\"createdComments\""));
        verify(feedActionService, times(3)).createComment(any(), any(), any());
    }

    @Test
    void executeCreateLikesJobCreatesLikes() {
        User likerA = User.builder()
            .phoneNumber("+15550000011")
            .username("liker_a")
            .role("ROLE_TEST_USER")
            .build();
        ReflectionTestUtils.setField(likerA, "id", 11L);
        User likerB = User.builder()
            .phoneNumber("+15550000012")
            .username("liker_b")
            .role("ROLE_TEST_USER")
            .build();
        ReflectionTestUtils.setField(likerB, "id", 12L);

        User author = User.builder()
            .phoneNumber("+15550000021")
            .username("author")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(author, "id", 21L);

        Rating rating = Rating.builder()
            .score(new BigDecimal("4.0"))
            .reviewText("review")
            .visibility(Visibility.PUBLIC)
            .build();
        ReflectionTestUtils.setField(rating, "id", 77L);

        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_LIKE)
            .status(AdminJobStatus.IN_PROGRESS)
            .description("Create 2 test likes")
            .payloadJson("{\"count\":2}")
            .build();
        ReflectionTestUtils.setField(job, "id", 14L);

        when(adminJobRepository.findById(14L)).thenReturn(Optional.of(job));
        when(adminJobRepository.save(any(AdminJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userService.findAllTestUsers()).thenReturn(List.of(likerA, likerB));
        when(ratingRepository.findRecentByVisibility(any(), any())).thenReturn(List.of(rating));
        when(ratingLikeRepository.existsByRatingAndUser(any(), any())).thenReturn(false);
        when(ratingLikeRepository.findByRatingAndUser(any(), any())).thenAnswer(invocation -> {
            User liker = invocation.getArgument(1);
            RatingLike like = RatingLike.builder()
                .rating(rating)
                .user(liker)
                .build();
            ReflectionTestUtils.setField(like, "id", (long) (liker.getPhoneNumber().hashCode() & Integer.MAX_VALUE));
            ReflectionTestUtils.setField(like, "createdAt", Instant.parse("2025-01-01T00:00:00Z"));
            return Optional.of(like);
        });

        adminJobService.executeCreateLikesJob(14L);

        assertEquals(AdminJobStatus.DONE, job.getStatus());
        assertEquals("Created 2 test likes", job.getResultSummary());
        assertTrue(job.getResultJson().contains("\"createdLikes\""));
        verify(feedActionService, times(2)).likeRating(any(), any());
    }

    @Test
    void getJobDetailIncludesCreatedUsersAndNarrative() {
        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_USER)
            .status(AdminJobStatus.DONE)
            .description("Create 2 test users")
            .payloadJson("{\"count\":2,\"usernamePrefix\":\"alpha\",\"phonePrefix\":\"+1555000\"}")
            .resultJson("{\"createdUsers\":[{\"userId\":1,\"username\":\"alpha_11_001\",\"phoneNumber\":\"+15550000011001\",\"role\":\"ROLE_TEST_USER\"},{\"userId\":2,\"username\":\"alpha_11_002\",\"phoneNumber\":\"+15550000011002\",\"role\":\"ROLE_TEST_USER\"}],\"count\":2}")
            .resultSummary("Created 2 test users")
            .build();
        ReflectionTestUtils.setField(job, "id", 11L);

        when(adminJobRepository.findById(11L)).thenReturn(Optional.of(job));

        AdminJobDetailDto detail = adminJobService.getJobDetail(11L);

        assertEquals(2, detail.createdUsers().size());
        assertEquals("Created 2 test users: alpha_11_001 (+15550000011001), alpha_11_002 (+15550000011002).", detail.narrative());
    }

    @Test
    void getJobDetailIncludesCreatedPostsAndNarrative() {
        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_POST)
            .status(AdminJobStatus.DONE)
            .description("Create 2 test posts")
            .payloadJson("{\"count\":2,\"bodyPrefix\":\"body\",\"reviewPrefix\":\"review\"}")
            .resultJson("{\"createdPosts\":[{\"ratingId\":1,\"body\":\"A body\",\"reviewText\":\"review text\",\"score\":4.5,\"authorUsername\":\"alpha\",\"authorPhoneNumber\":\"+15550000001\",\"itemType\":\"TEXT_POST\"},{\"ratingId\":2,\"body\":\"B body\",\"reviewText\":\"review text\",\"score\":4.0,\"authorUsername\":\"beta\",\"authorPhoneNumber\":\"+15550000002\",\"itemType\":\"TEXT_POST\"}],\"count\":2}")
            .resultSummary("Created 2 test posts")
            .build();
        ReflectionTestUtils.setField(job, "id", 12L);

        when(adminJobRepository.findById(12L)).thenReturn(Optional.of(job));

        AdminJobDetailDto detail = adminJobService.getJobDetail(12L);

        assertEquals(2, detail.createdPosts().size());
        assertEquals("Created 2 test posts: A body by alpha, B body by beta.", detail.narrative());
    }

    @Test
    void getJobDetailIncludesCreatedCommentsAndNarrative() {
        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_COMMENT)
            .status(AdminJobStatus.DONE)
            .description("Create 2 test comments")
            .payloadJson("{\"count\":2,\"maxDepth\":3,\"replyChance\":0.5,\"commentPrefix\":\"comment\",\"replyPrefix\":\"reply\"}")
            .resultJson("{\"createdComments\":[{\"commentId\":1,\"ratingId\":99,\"parentCommentId\":null,\"text\":\"comment one\",\"score\":4.5,\"authorUsername\":\"alpha\",\"authorPhoneNumber\":\"+15550000001\",\"createdAt\":\"2025-01-01T00:00:00Z\"},{\"commentId\":2,\"ratingId\":99,\"parentCommentId\":1,\"text\":\"reply two\",\"score\":4.0,\"authorUsername\":\"beta\",\"authorPhoneNumber\":\"+15550000002\",\"createdAt\":\"2025-01-01T00:01:00Z\"}],\"count\":2}")
            .resultSummary("Created 2 test comments")
            .build();
        ReflectionTestUtils.setField(job, "id", 13L);

        when(adminJobRepository.findById(13L)).thenReturn(Optional.of(job));

        AdminJobDetailDto detail = adminJobService.getJobDetail(13L);

        assertEquals(2, detail.createdComments().size());
        assertEquals("Created 2 test comments: root by alpha, reply to #1 by beta.", detail.narrative());
    }

    @Test
    void getJobDetailIncludesCreatedLikesAndNarrative() {
        AdminJob job = AdminJob.builder()
            .jobType(AdminJobType.CREATE_LIKE)
            .status(AdminJobStatus.DONE)
            .description("Create 2 test likes")
            .payloadJson("{\"count\":2}")
            .resultJson("{\"createdLikes\":[{\"likeId\":1,\"ratingId\":99,\"authorUsername\":\"alpha\",\"authorPhoneNumber\":\"+15550000001\",\"createdAt\":\"2025-01-01T00:00:00Z\"},{\"likeId\":2,\"ratingId\":98,\"authorUsername\":\"beta\",\"authorPhoneNumber\":\"+15550000002\",\"createdAt\":\"2025-01-01T00:01:00Z\"}],\"count\":2}")
            .resultSummary("Created 2 test likes")
            .build();
        ReflectionTestUtils.setField(job, "id", 14L);

        when(adminJobRepository.findById(14L)).thenReturn(Optional.of(job));

        AdminJobDetailDto detail = adminJobService.getJobDetail(14L);

        assertEquals(2, detail.createdLikes().size());
        assertEquals("Created 2 test likes: alpha on #99, beta on #98.", detail.narrative());
    }
}
