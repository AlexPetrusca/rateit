package com.rateit.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)

@Entity
@Table(
    name = "user_external_accounts",
    indexes = {
        @Index(name = "idx_user_external_accounts_user_id", columnList = "user_id"),
        @Index(name = "idx_user_external_accounts_external_integration_id", columnList = "external_integration_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_external_accounts_provider_user", columnNames = {"external_integration_id", "external_user_id"}),
        @UniqueConstraint(name = "uk_user_external_accounts_user_provider", columnNames = {"user_id", "external_integration_id"})
    }
)
public class UserExternalAccount extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "external_integration_id", nullable = false)
    private ExternalIntegration externalIntegration;

    @Column(name = "external_user_id", nullable = false)
    private String externalUserId;

    @Column(name = "external_username")
    private String externalUsername;

    @Column(name = "access_token_ref")
    private String accessTokenRef;

    @Column(name = "refresh_token_ref")
    private String refreshTokenRef;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;
}
