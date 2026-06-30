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
    name = "tourney_players",
    indexes = {
        @Index(name = "idx_tourney_players_owner_user_id", columnList = "owner_user_id"),
        @Index(name = "idx_tourney_players_critic_user_id", columnList = "critic_user_id"),
        @Index(name = "idx_tourney_players_display_name", columnList = "display_name")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_tourney_players_owner_display_name", columnNames = {"owner_user_id", "display_name"}),
        @UniqueConstraint(name = "uk_tourney_players_owner_critic_user", columnNames = {"owner_user_id", "critic_user_id"})
    }
)
public class TourneyPlayer extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User ownerUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "critic_user_id")
    private User criticUser;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;
}
