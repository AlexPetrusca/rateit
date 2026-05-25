package com.rateit.backend.repository;

import com.rateit.backend.entity.RateableItem;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateableItemRepository extends JpaRepository<RateableItem, Long> {
    long countByCreatedByUser(User createdByUser);
}
