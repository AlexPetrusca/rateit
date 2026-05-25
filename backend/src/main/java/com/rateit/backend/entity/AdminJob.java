package com.rateit.backend.entity;

import com.rateit.backend.entity.types.AdminJobStatus;
import com.rateit.backend.entity.types.AdminJobType;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "admin_jobs")
public class AdminJob extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_type", nullable = false)
    private AdminJobType jobType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AdminJobStatus status;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "payload_json", columnDefinition = "text", nullable = false)
    private String payloadJson;

    @Column(name = "result_summary", columnDefinition = "text")
    private String resultSummary;

    @Column(name = "result_json", columnDefinition = "text")
    private String resultJson;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "started_at")
    private java.time.Instant startedAt;

    @Column(name = "finished_at")
    private java.time.Instant finishedAt;
}
