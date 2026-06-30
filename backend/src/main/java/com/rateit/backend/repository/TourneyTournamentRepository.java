package com.rateit.backend.repository;

import com.rateit.backend.entity.TourneyTournament;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TourneyTournamentRepository extends JpaRepository<TourneyTournament, Long> {
    List<TourneyTournament> findByOwnerUserOrderByTournamentDateDescCreatedAtDesc(User ownerUser);
}
