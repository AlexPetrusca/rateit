package com.rateit.backend.repository;

import com.rateit.backend.entity.RatingComment;
import com.rateit.backend.entity.RatingCommentLike;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface RatingCommentLikeRepository extends JpaRepository<RatingCommentLike, Long> {

    long countByComment(RatingComment comment);
    long countByUser(User user);
    void deleteByComment(RatingComment comment);
    void deleteByUser(User user);

    boolean existsByCommentAndUser(RatingComment comment, User user);

    Optional<RatingCommentLike> findByCommentAndUser(RatingComment comment, User user);

    @Query("""
        select l.comment.id, count(l)
        from RatingCommentLike l
        where l.comment.id in :commentIds
        group by l.comment.id
        """)
    List<Object[]> countLikesByCommentIds(@Param("commentIds") Collection<Long> commentIds);

    @Query("""
        select distinct l.comment.id
        from RatingCommentLike l
        where l.user = :user
          and l.comment.id in :commentIds
        """)
    List<Long> findLikedCommentIdsByUserAndCommentIds(
        @Param("user") User user,
        @Param("commentIds") Collection<Long> commentIds
    );
}
