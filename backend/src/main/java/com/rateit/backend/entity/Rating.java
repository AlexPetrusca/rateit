package com.rateit.backend.entity;

import com.rateit.backend.entity.types.Visibility;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

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
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_ratings_author_rateable_item", columnNames = {"author_user_id", "rateable_item_id"})
    }
)
public class Rating extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_user_id", nullable = false)
    private User authorUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rateable_item_id", nullable = false)
    private RateableItem rateableItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rating_scale_id", nullable = false)
    private RatingScale ratingScale;

    @Column(name = "score", nullable = false, precision = 10, scale = 2)
    private BigDecimal score;

    @Column(name = "review_text", columnDefinition = "text")
    private String reviewText;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private Visibility visibility;
}
