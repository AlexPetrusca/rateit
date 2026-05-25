package com.rateit.backend.repository;

import com.rateit.backend.entity.Friendship;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
    long countByRequesterUserOrAddresseeUser(User requesterUser, User addresseeUser);
}
