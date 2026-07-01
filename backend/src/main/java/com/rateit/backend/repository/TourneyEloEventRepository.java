package com.rateit.backend.repository;

import com.rateit.backend.entity.TourneyEloEvent;
import com.rateit.backend.entity.TourneyMatch;
import com.rateit.backend.entity.TourneyPlayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TourneyEloEventRepository extends JpaRepository<TourneyEloEvent, Long> {
    List<TourneyEloEvent> findByPlayerOrderByCreatedAtDesc(TourneyPlayer player);
    List<TourneyEloEvent> findByMatch(TourneyMatch match);
    List<TourneyEloEvent> findByPlayerAndRatingSystemOrderByEventOrderAscIdAsc(TourneyPlayer player, String ratingSystem);
    long countByRatingSystem(String ratingSystem);
    void deleteByRatingSystem(String ratingSystem);
}
