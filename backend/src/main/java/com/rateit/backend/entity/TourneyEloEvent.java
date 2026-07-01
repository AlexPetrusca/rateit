package com.rateit.backend.entity;

import com.rateit.backend.entity.types.TourneyEloEventType;
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
    name = "tourney_elo_events",
    indexes = {
        @Index(name = "idx_tourney_elo_events_player_id", columnList = "player_id"),
        @Index(name = "idx_tourney_elo_events_match_id", columnList = "match_id"),
        @Index(name = "idx_tourney_elo_events_created_at", columnList = "created_at")
    }
)
public class TourneyEloEvent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id", nullable = false)
    private TourneyPlayer player;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id")
    private TourneyMatch match;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id")
    private TourneyTournament tournament;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private TourneyEloEventType eventType;

    @Column(name = "rating_system", nullable = false)
    private String ratingSystem;

    @Column(name = "event_order")
    private Long eventOrder;

    @Column(name = "rating_before", nullable = false, precision = 10, scale = 2)
    private BigDecimal ratingBefore;

    @Column(name = "rating_after", nullable = false, precision = 10, scale = 2)
    private BigDecimal ratingAfter;

    @Column(name = "rating_delta", nullable = false, precision = 10, scale = 2)
    private BigDecimal ratingDelta;
}
