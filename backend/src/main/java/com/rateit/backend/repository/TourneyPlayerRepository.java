package com.rateit.backend.repository;

import com.rateit.backend.entity.TourneyPlayer;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TourneyPlayerRepository extends JpaRepository<TourneyPlayer, Long> {
    List<TourneyPlayer> findByOwnerUserOrderByDisplayNameAsc(User ownerUser);
    Optional<TourneyPlayer> findByOwnerUserAndDisplayNameIgnoreCase(User ownerUser, String displayName);
}
