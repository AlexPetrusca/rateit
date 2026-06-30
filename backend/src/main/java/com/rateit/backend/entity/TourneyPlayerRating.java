package com.rateit.backend.entity;

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
    name = "tourney_player_ratings",
    indexes = {
        @Index(name = "idx_tourney_player_ratings_player_id", columnList = "player_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_tourney_player_ratings_player_system", columnNames = {"player_id", "rating_system"})
    }
)
public class TourneyPlayerRating extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id", nullable = false)
    private TourneyPlayer player;

    @Column(name = "rating_system", nullable = false)
    private String ratingSystem;

    @Column(name = "rating", nullable = false, precision = 10, scale = 2)
    private BigDecimal rating;

    @Column(name = "matches_played", nullable = false)
    private Integer matchesPlayed;

    @Column(name = "last_rated_at")
    private Instant lastRatedAt;
}
