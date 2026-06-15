package com.rateit.backend.repository;

import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.types.Visibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {

    long countByAuthorUser(User authorUser);
    java.util.List<Rating> findByAuthorUser(User authorUser);

    @Query("""
        select r
        from Rating r
        join fetch r.authorUser
        join fetch r.rateableItem item
        join fetch r.ratingScale
        left join fetch item.mediaAsset
        where r.authorUser = :authorUser
          and r.deletedAt is null
        order by r.createdAt desc
        """)
    Page<Rating> findProfilePageByAuthorUser(@Param("authorUser") User authorUser, Pageable pageable);

    @Query("""
        select count(r)
        from Rating r
        join r.rateableItem item
        where r.authorUser = :authorUser
          and r.deletedAt is null
        """)
    long countByAuthorUserForProfile(@Param("authorUser") User authorUser);

    @Query("""
        select r
        from Rating r
        join fetch r.authorUser
        join fetch r.rateableItem item
        join fetch r.ratingScale
        left join fetch item.mediaAsset
        where r.authorUser = :authorUser
          and r.visibility = :visibility
          and item.visibility = :visibility
          and r.deletedAt is null
        order by r.createdAt desc
        """)
    Page<Rating> findProfilePageByAuthorUserAndVisibility(
        @Param("authorUser") User authorUser,
        @Param("visibility") Visibility visibility,
        Pageable pageable
    );

    @Query("""
        select count(r)
        from Rating r
        join r.rateableItem item
        where r.authorUser = :authorUser
          and r.visibility = :visibility
          and item.visibility = :visibility
          and r.deletedAt is null
        """)
    long countByAuthorUserAndVisibilityForProfile(
        @Param("authorUser") User authorUser,
        @Param("visibility") Visibility visibility
    );

    @Query("""
        select r
        from Rating r
        join fetch r.authorUser
        join fetch r.rateableItem item
        join fetch r.ratingScale
        left join fetch item.mediaAsset
        where r.visibility = :visibility
          and item.visibility = :visibility
          and r.deletedAt is null
        order by r.createdAt desc
        """)
    List<Rating> findRecentByVisibility(@Param("visibility") Visibility visibility, Pageable pageable);

    @Query(
        value = """
            select distinct r
            from Rating r
            join fetch r.authorUser
            join fetch r.rateableItem item
            join fetch r.ratingScale
            left join fetch item.mediaAsset
            order by r.createdAt desc
            """,
        countQuery = "select count(r) from Rating r"
    )
    Page<Rating> findAdminPage(Pageable pageable);
}
