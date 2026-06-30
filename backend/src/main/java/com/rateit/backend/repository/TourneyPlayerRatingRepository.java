package com.rateit.backend.repository;

import com.rateit.backend.entity.TourneyPlayer;
import com.rateit.backend.entity.TourneyPlayerRating;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TourneyPlayerRatingRepository extends JpaRepository<TourneyPlayerRating, Long> {
    Optional<TourneyPlayerRating> findByPlayerAndRatingSystem(TourneyPlayer player, String ratingSystem);
}
