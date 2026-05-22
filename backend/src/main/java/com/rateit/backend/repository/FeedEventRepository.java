package com.rateit.backend.repository;

import com.rateit.backend.entity.FeedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedEventRepository extends JpaRepository<FeedEvent, Long> {
}
