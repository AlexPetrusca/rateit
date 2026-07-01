package com.rateit.backend.repository;

import com.rateit.backend.entity.TourneyPlayer;
import com.rateit.backend.entity.TourneyPlayerRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TourneyPlayerRatingRepository extends JpaRepository<TourneyPlayerRating, Long> {
    Optional<TourneyPlayerRating> findByPlayerAndRatingSystem(TourneyPlayer player, String ratingSystem);

    @Query("""
        select r from TourneyPlayerRating r
        join fetch r.player p
        left join fetch p.criticUser
        where r.ratingSystem = :ratingSystem
        order by r.rating desc, r.id asc
        """)
    List<TourneyPlayerRating> findAllByRatingSystemOrderByRatingDescIdAsc(@Param("ratingSystem") String ratingSystem);

    @Query("""
        select r from TourneyPlayerRating r
        join fetch r.player p
        left join fetch p.criticUser
        where r.ratingSystem = :ratingSystem
          and p.criticUser.id = :criticUserId
        order by r.lastRatedAt desc, r.rating desc, r.id asc
        """)
    List<TourneyPlayerRating> findAllByCriticUserIdAndRatingSystemOrderByLastRatedAtDescRatingDescIdAsc(
        @Param("criticUserId") Long criticUserId,
        @Param("ratingSystem") String ratingSystem
    );

    void deleteByRatingSystem(String ratingSystem);
}
