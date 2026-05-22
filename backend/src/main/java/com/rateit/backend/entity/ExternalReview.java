package com.rateit.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)

@Entity
@Table(
    name = "external_reviews",
    indexes = {
        @Index(name = "idx_external_reviews_user_external_account_id", columnList = "user_external_account_id"),
        @Index(name = "idx_external_reviews_rateable_item_id", columnList = "rateable_item_id"),
        @Index(name = "idx_external_reviews_rating_id", columnList = "rating_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_external_reviews_account_review", columnNames = {"user_external_account_id", "external_review_id"})
    }
)
public class ExternalReview extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_external_account_id", nullable = false)
    private UserExternalAccount userExternalAccount;

    @Column(name = "external_review_id", nullable = false)
    private String externalReviewId;

    @Column(name = "title")
    private String title;

    @Column(name = "body", columnDefinition = "text")
    private String body;

    @Column(name = "score", precision = 10, scale = 2)
    private BigDecimal score;

    @Column(name = "source_url")
    private String sourceUrl;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rateable_item_id")
    private RateableItem rateableItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rating_id")
    private Rating rating;
}
