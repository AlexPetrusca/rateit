package com.rateit.backend.repository;

import com.rateit.backend.entity.RateableItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateableItemRepository extends JpaRepository<RateableItem, Long> {
}
