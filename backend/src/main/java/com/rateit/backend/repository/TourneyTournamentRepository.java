package com.rateit.backend.repository;

import com.rateit.backend.entity.TourneyTournament;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TourneyTournamentRepository extends JpaRepository<TourneyTournament, Long> {
    List<TourneyTournament> findByOwnerUserOrderByTournamentDateDescCreatedAtDesc(User ownerUser);

    List<TourneyTournament> findAllByOrderByTournamentDateDescCreatedAtDesc();

    List<TourneyTournament> findAllByOrderByTournamentDateAscCreatedAtAscIdAsc();

    // In-progress live tournaments the given Critic user is a roster member of
    // (via a tourney player linked to their account). Powers the LIVE banner.
    @Query("""
        select t from TourneyTournament t
        where t.mode = com.rateit.backend.entity.types.TourneyTournamentMode.LIVE
          and t.status = com.rateit.backend.entity.types.TourneyTournamentStatus.ACTIVE
          and exists (
            select 1 from TourneyTournamentPlayer tp
            where tp.tournament = t and tp.player.criticUser.id = :criticUserId
          )
        order by t.tournamentDate desc, t.createdAt desc
        """)
    List<TourneyTournament> findActiveLiveForCriticUser(@Param("criticUserId") Long criticUserId);
}
