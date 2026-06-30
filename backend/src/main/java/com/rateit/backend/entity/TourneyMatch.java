package com.rateit.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
    name = "tourney_matches",
    indexes = {
        @Index(name = "idx_tourney_matches_tournament_id", columnList = "tournament_id"),
        @Index(name = "idx_tourney_matches_team_a_id", columnList = "team_a_id"),
        @Index(name = "idx_tourney_matches_team_b_id", columnList = "team_b_id")
    }
)
public class TourneyMatch extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tournament_id", nullable = false)
    private TourneyTournament tournament;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_a_id", nullable = false)
    private TourneyTeam teamA;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_b_id", nullable = false)
    private TourneyTeam teamB;

    @Column(name = "round_number", nullable = false)
    private Integer roundNumber;

    @Column(name = "round_name", nullable = false)
    private String roundName;

    @Column(name = "court")
    private String court;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "team_a_score")
    private Integer teamAScore;

    @Column(name = "team_b_score")
    private Integer teamBScore;
}
