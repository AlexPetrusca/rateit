package com.rateit.backend.entity.dto;

import com.rateit.backend.entity.AdminJob;
import com.rateit.backend.entity.rest.CreateCommentsJobRequest;
import com.rateit.backend.entity.rest.CreateLikesJobRequest;
import com.rateit.backend.entity.rest.CreateUsersJobRequest;
import com.rateit.backend.entity.rest.CreatePostsJobRequest;
import com.rateit.backend.entity.types.AdminJobStatus;
import com.rateit.backend.entity.types.AdminJobType;

import java.time.Instant;
import java.util.List;

public record AdminJobDetailDto(
    Long id,
    AdminJobType jobType,
    AdminJobStatus status,
    String description,
    String narrative,
    String resultSummary,
    String errorMessage,
    Instant createdAt,
    Instant startedAt,
    Instant finishedAt,
    CreateUsersJobRequest createUsersRequest,
    List<CreatedAdminUserDto> createdUsers,
    CreatePostsJobRequest createPostsRequest,
    List<CreatedAdminPostDto> createdPosts,
    CreateCommentsJobRequest createCommentsRequest,
    List<CreatedAdminCommentDto> createdComments,
    CreateLikesJobRequest createLikesRequest,
    List<CreatedAdminLikeDto> createdLikes
) {
    public static AdminJobDetailDto fromJob(
        AdminJob job,
        String narrative,
        CreateUsersJobRequest createUsersRequest,
        List<CreatedAdminUserDto> createdUsers,
        CreatePostsJobRequest createPostsRequest,
        List<CreatedAdminPostDto> createdPosts,
        CreateCommentsJobRequest createCommentsRequest,
        List<CreatedAdminCommentDto> createdComments,
        CreateLikesJobRequest createLikesRequest,
        List<CreatedAdminLikeDto> createdLikes
    ) {
        return new AdminJobDetailDto(
            job.getId(),
            job.getJobType(),
            job.getStatus(),
            job.getDescription(),
            narrative,
            job.getResultSummary(),
            job.getErrorMessage(),
            job.getCreatedAt(),
            job.getStartedAt(),
            job.getFinishedAt(),
            createUsersRequest,
            createdUsers,
            createPostsRequest,
            createdPosts,
            createCommentsRequest,
            createdComments,
            createLikesRequest,
            createdLikes
        );
    }
}
