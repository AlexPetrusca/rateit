package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.AdminJobDto;
import com.rateit.backend.entity.dto.AdminJobDetailDto;
import com.rateit.backend.entity.rest.CreateCommentsJobRequest;
import com.rateit.backend.entity.rest.CreateLikesJobRequest;
import com.rateit.backend.entity.rest.CreatePostsJobRequest;
import com.rateit.backend.entity.rest.CreateUsersJobRequest;
import com.rateit.backend.service.AdminJobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/jobs")
@RequiredArgsConstructor
public class AdminJobController {

    private final AdminJobService adminJobService;

    @PostMapping("/create-users")
    public ResponseEntity<AdminJobDto> queueCreateUsers(
        @RequestBody @Valid CreateUsersJobRequest request
    ) {
        return ResponseEntity.accepted().body(adminJobService.queueCreateUsersJob(request));
    }

    @PostMapping("/create-posts")
    public ResponseEntity<AdminJobDto> queueCreatePosts(
        @RequestBody @Valid CreatePostsJobRequest request
    ) {
        return ResponseEntity.accepted().body(adminJobService.queueCreatePostsJob(request));
    }

    @PostMapping("/create-comments")
    public ResponseEntity<AdminJobDto> queueCreateComments(
        @RequestBody @Valid CreateCommentsJobRequest request
    ) {
        return ResponseEntity.accepted().body(adminJobService.queueCreateCommentsJob(request));
    }

    @PostMapping("/create-likes")
    public ResponseEntity<AdminJobDto> queueCreateLikes(
        @RequestBody @Valid CreateLikesJobRequest request
    ) {
        return ResponseEntity.accepted().body(adminJobService.queueCreateLikesJob(request));
    }

    @GetMapping
    public ResponseEntity<List<AdminJobDto>> listJobs(@RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(adminJobService.listJobs(limit));
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<AdminJobDetailDto> getJob(@PathVariable long jobId) {
        return ResponseEntity.ok(adminJobService.getJobDetail(jobId));
    }
}
