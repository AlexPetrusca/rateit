package com.rateit.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
    name = "tourney_teams",
    indexes = {
        @Index(name = "idx_tourney_teams_tournament_id", columnList = "tournament_id"),
        @Index(name = "idx_tourney_teams_player_one_id", columnList = "player_one_id"),
        @Index(name = "idx_tourney_teams_player_two_id", columnList = "player_two_id"),
        @Index(name = "idx_tourney_teams_pair", columnList = "player_low_id, player_high_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_tourney_teams_tournament_name", columnNames = {"tournament_id", "name"}),
        @UniqueConstraint(name = "uk_tourney_teams_tournament_pair", columnNames = {"tournament_id", "player_low_id", "player_high_id"})
    }
)
public class TourneyTeam extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tournament_id", nullable = false)
    private TourneyTournament tournament;

    @Column(name = "name", nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_one_id", nullable = false)
    private TourneyPlayer playerOne;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_two_id", nullable = false)
    private TourneyPlayer playerTwo;

    @Column(name = "player_low_id", nullable = false)
    private Long playerLowId;

    @Column(name = "player_high_id", nullable = false)
    private Long playerHighId;
}
