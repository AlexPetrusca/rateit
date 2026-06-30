package com.rateit.backend.repository;

import com.rateit.backend.entity.TourneyPlayer;
import com.rateit.backend.entity.TourneyTournament;
import com.rateit.backend.entity.TourneyTournamentPlayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TourneyTournamentPlayerRepository extends JpaRepository<TourneyTournamentPlayer, Long> {
    List<TourneyTournamentPlayer> findByTournamentOrderBySeedNumberAscCreatedAtAsc(TourneyTournament tournament);
    long countByTournament(TourneyTournament tournament);
    boolean existsByTournamentAndPlayer(TourneyTournament tournament, TourneyPlayer player);
    Optional<TourneyTournamentPlayer> findByTournamentAndPlayer(TourneyTournament tournament, TourneyPlayer player);
}
