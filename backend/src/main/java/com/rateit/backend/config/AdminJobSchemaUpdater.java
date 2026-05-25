package com.rateit.backend.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AdminJobSchemaUpdater {

    private final JdbcTemplate jdbcTemplate;

    public AdminJobSchemaUpdater(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void updateJobTypeConstraint() {
        jdbcTemplate.execute("""
            alter table if exists admin_jobs
                drop constraint if exists admin_jobs_job_type_check
            """);
        jdbcTemplate.execute("""
            alter table if exists admin_jobs
                add constraint admin_jobs_job_type_check
                check (job_type in ('CREATE_USER', 'CREATE_POST', 'CREATE_COMMENT', 'CREATE_LIKE'))
            """);
    }
}
