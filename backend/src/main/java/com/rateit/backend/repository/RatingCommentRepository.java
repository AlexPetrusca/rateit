package com.rateit.backend.repository;

import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingComment;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RatingCommentRepository extends JpaRepository<RatingComment, Long> {

    List<RatingComment> findByRatingOrderByCreatedAtAsc(Rating rating);

    @Query("""
        select c
        from RatingComment c
        join fetch c.authorUser
        left join fetch c.parentComment
        where c.rating = :rating
        order by c.createdAt asc
        """)
    List<RatingComment> findThreadByRatingOrderByCreatedAtAsc(Rating rating);

    long countByRating(Rating rating);
    long countByAuthorUser(User authorUser);
}
