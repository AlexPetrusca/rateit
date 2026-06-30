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
    name = "tourney_tournament_players",
    indexes = {
        @Index(name = "idx_tourney_tournament_players_tournament_id", columnList = "tournament_id"),
        @Index(name = "idx_tourney_tournament_players_player_id", columnList = "player_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_tourney_tournament_players_tournament_player", columnNames = {"tournament_id", "player_id"})
    }
)
public class TourneyTournamentPlayer extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tournament_id", nullable = false)
    private TourneyTournament tournament;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id", nullable = false)
    private TourneyPlayer player;

    @Column(name = "seed_number")
    private Integer seedNumber;

    @Column(name = "checked_in", nullable = false)
    private Boolean checkedIn;
}
