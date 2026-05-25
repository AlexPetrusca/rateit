package com.rateit.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminJobProcessor {

    private final AdminJobService adminJobService;

    @Scheduled(fixedDelayString = "${admin.jobs.poll-interval-ms:1000}")
    public void processPendingJobs() {
        while (true) {
            var job = adminJobService.claimNextPendingJob();
            if (job == null) {
                return;
            }

            try {
                switch (job.getJobType()) {
                    case CREATE_USER -> adminJobService.executeCreateUsersJob(job.getId());
                    case CREATE_POST -> adminJobService.executeCreatePostsJob(job.getId());
                }
            } catch (Exception ex) {
                adminJobService.markJobFailed(job.getId(), ex.getMessage());
            }
        }
    }
}
