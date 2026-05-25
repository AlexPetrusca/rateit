package com.rateit.backend.repository;

import com.rateit.backend.entity.Follow;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {
    long countByFollowerUserOrFollowedUser(User followerUser, User followedUser);
    void deleteByFollowerUserOrFollowedUser(User followerUser, User followedUser);
}
