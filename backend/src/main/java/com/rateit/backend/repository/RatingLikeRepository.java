package com.rateit.backend.repository;

import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingLike;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RatingLikeRepository extends JpaRepository<RatingLike, Long> {

    long countByRating(Rating rating);
    long countByUser(User user);
    void deleteByRating(Rating rating);

    boolean existsByRatingAndUser(Rating rating, User user);

    Optional<RatingLike> findByRatingAndUser(Rating rating, User user);
}
