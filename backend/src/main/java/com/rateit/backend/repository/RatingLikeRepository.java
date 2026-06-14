package com.rateit.backend.repository;

import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingLike;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface RatingLikeRepository extends JpaRepository<RatingLike, Long> {

    long countByRating(Rating rating);
    long countByUser(User user);
    void deleteByRating(Rating rating);
    void deleteByUser(User user);

    boolean existsByRatingAndUser(Rating rating, User user);

    Optional<RatingLike> findByRatingAndUser(Rating rating, User user);

    @Query("""
        select r.id, count(l)
        from RatingLike l
        join l.rating r
        where r.id in :ratingIds
        group by r.id
        """)
    List<Object[]> countLikesByRatingIds(@Param("ratingIds") Collection<Long> ratingIds);

    @Query("""
        select distinct r.id
        from RatingLike l
        join l.rating r
        where l.user = :user
          and r.id in :ratingIds
        """)
    List<Long> findLikedRatingIdsByUserAndRatingIds(
        @Param("user") User user,
        @Param("ratingIds") Collection<Long> ratingIds
    );
}
