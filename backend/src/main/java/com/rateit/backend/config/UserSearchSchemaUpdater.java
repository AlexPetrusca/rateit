package com.rateit.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Enables Postgres trigram search for username lookup: the pg_trgm extension
// provides similarity() (typo-tolerant fuzzy matching) and a GIN index to keep
// it fast. Guarded so a missing privilege never blocks startup — the search
// query degrades to exact/prefix/substring matching if the extension is absent.
@Component
public class UserSearchSchemaUpdater {

    private static final Logger log = LoggerFactory.getLogger(UserSearchSchemaUpdater.class);

    private final JdbcTemplate jdbcTemplate;

    public UserSearchSchemaUpdater(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureTrigramSearch() {
        try {
            jdbcTemplate.execute("create extension if not exists pg_trgm");
            jdbcTemplate.execute(
                "create index if not exists idx_users_username_trgm on users using gin (lower(username) gin_trgm_ops)");
        } catch (Exception e) {
            log.warn("Could not set up pg_trgm username search (falling back to non-fuzzy matching): {}", e.getMessage());
        }
    }
}
