package com.rateit.backend.repository;

import com.rateit.backend.entity.TourneyTeam;
import com.rateit.backend.entity.TourneyTournament;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TourneyTeamRepository extends JpaRepository<TourneyTeam, Long> {
    List<TourneyTeam> findByTournamentOrderByNameAsc(TourneyTournament tournament);
    long countByTournament(TourneyTournament tournament);
    Optional<TourneyTeam> findByTournamentAndPlayerLowIdAndPlayerHighId(TourneyTournament tournament, Long playerLowId, Long playerHighId);
}
