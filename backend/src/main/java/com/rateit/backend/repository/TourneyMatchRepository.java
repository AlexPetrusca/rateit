package com.rateit.backend.repository;

import com.rateit.backend.entity.TourneyMatch;
import com.rateit.backend.entity.TourneyTournament;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TourneyMatchRepository extends JpaRepository<TourneyMatch, Long> {
    List<TourneyMatch> findByTournamentOrderByRoundNumberAscIdAsc(TourneyTournament tournament);
    void deleteByTournament(TourneyTournament tournament);
}
