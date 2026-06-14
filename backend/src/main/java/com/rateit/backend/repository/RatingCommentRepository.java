package com.rateit.backend.repository;

import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingComment;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface RatingCommentRepository extends JpaRepository<RatingComment, Long> {

    List<RatingComment> findByRatingOrderByCreatedAtAsc(Rating rating);
    List<RatingComment> findByParentCommentOrderByCreatedAtAsc(RatingComment parentComment);
    void deleteByAuthorUser(User authorUser);

    @Query("""
        select c
        from RatingComment c
        join fetch c.authorUser
        left join fetch c.parentComment
        where c.rating = :rating
        order by c.createdAt asc
        """)
    List<RatingComment> findThreadByRatingOrderByCreatedAtAsc(Rating rating);

    @Query(
        value = """
            select distinct c
            from RatingComment c
            join fetch c.authorUser
            join fetch c.rating r
            join fetch r.authorUser ratingAuthor
            join fetch r.rateableItem item
            left join fetch c.parentComment
            left join fetch item.mediaAsset
            order by c.createdAt desc
            """,
        countQuery = "select count(c) from RatingComment c"
    )
    Page<RatingComment> findAdminPage(Pageable pageable);

    long countByRating(Rating rating);
    long countByParentComment(RatingComment parentComment);
    long countByAuthorUser(User authorUser);

    @Query("""
        select r.id, count(c)
        from RatingComment c
        join c.rating r
        where r.id in :ratingIds
        group by r.id
        """)
    List<Object[]> countCommentsByRatingIds(@Param("ratingIds") Collection<Long> ratingIds);
}
