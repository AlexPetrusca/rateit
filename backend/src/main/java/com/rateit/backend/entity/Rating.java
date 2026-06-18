package com.rateit.backend.entity;

import com.rateit.backend.entity.types.RatingStatus;
import com.rateit.backend.entity.types.Visibility;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)

@Entity
@Table(
    name = "ratings",
    indexes = {
        @Index(name = "idx_ratings_author_user_id", columnList = "author_user_id"),
        @Index(name = "idx_ratings_rateable_item_id", columnList = "rateable_item_id")
    }
)
public class Rating extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_user_id", nullable = false)
    private User authorUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "rateable_item_id", nullable = true)
    private RateableItem rateableItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rating_scale_id", nullable = false)
    private RatingScale ratingScale;

    @Column(name = "score", precision = 10, scale = 2)
    private BigDecimal score;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RatingStatus status;

    @Column(name = "draft_body", columnDefinition = "text")
    private String draftBody;

    @Column(name = "draft_media_key", length = 500)
    private String draftMediaKey;

    @Column(name = "draft_media_type", length = 100)
    private String draftMediaType;

    @Column(name = "review_text", columnDefinition = "text")
    private String reviewText;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private Visibility visibility;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
