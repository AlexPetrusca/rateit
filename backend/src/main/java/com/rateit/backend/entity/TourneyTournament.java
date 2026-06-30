package com.rateit.backend.entity;

import com.rateit.backend.entity.types.TourneyTournamentFormat;
import com.rateit.backend.entity.types.TourneyTournamentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
    name = "tourney_tournaments",
    indexes = {
        @Index(name = "idx_tourney_tournaments_owner_user_id", columnList = "owner_user_id"),
        @Index(name = "idx_tourney_tournaments_tournament_date", columnList = "tournament_date")
    }
)
public class TourneyTournament extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User ownerUser;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "location")
    private String location;

    @Column(name = "tournament_date")
    private LocalDate tournamentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TourneyTournamentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false)
    private TourneyTournamentFormat format;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;
}
