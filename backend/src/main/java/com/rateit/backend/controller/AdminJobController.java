package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.AdminJobDto;
import com.rateit.backend.entity.dto.AdminJobDetailDto;
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

    @GetMapping
    public ResponseEntity<List<AdminJobDto>> listJobs(@RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(adminJobService.listJobs(limit));
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<AdminJobDetailDto> getJob(@PathVariable long jobId) {
        return ResponseEntity.ok(adminJobService.getJobDetail(jobId));
    }
}
