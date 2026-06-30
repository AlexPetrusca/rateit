package com.rateit.backend.repository;

import com.rateit.backend.entity.TourneyPlayer;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TourneyPlayerRepository extends JpaRepository<TourneyPlayer, Long> {
    List<TourneyPlayer> findByOwnerUserOrderByDisplayNameAsc(User ownerUser);
    Optional<TourneyPlayer> findByOwnerUserAndDisplayNameIgnoreCase(User ownerUser, String displayName);

    // Critic user ids for any player who has actually participated in a tournament
    // (linked to a tourney_player that appears in tourney_tournament_players).
    @Query("""
        select distinct tp.criticUser.id from TourneyPlayer tp
        where tp.criticUser is not null
          and exists (select 1 from TourneyTournamentPlayer ttp where ttp.player = tp)
        """)
    List<Long> findCriticUserIdsWithTournamentHistory();
}
