package com.rateit.backend.repository;

import com.rateit.backend.entity.Follow;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {
    long countByFollowerUserOrFollowedUser(User followerUser, User followedUser);
    void deleteByFollowerUserOrFollowedUser(User followerUser, User followedUser);

    boolean existsByFollowerUserAndFollowedUser(User followerUser, User followedUser);
    Optional<Follow> findByFollowerUserAndFollowedUser(User followerUser, User followedUser);
    long countByFollowedUser(User followedUser);
    long countByFollowerUser(User followerUser);

    @Query("""
        select f from Follow f
        join fetch f.followerUser
        where f.followedUser = :user
        order by f.createdAt desc
        """)
    List<Follow> findFollowers(@Param("user") User user);

    @Query("""
        select f from Follow f
        join fetch f.followedUser
        where f.followerUser = :user
        order by f.createdAt desc
        """)
    List<Follow> findFollowing(@Param("user") User user);
}
