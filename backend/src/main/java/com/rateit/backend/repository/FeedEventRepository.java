package com.rateit.backend.repository;

import com.rateit.backend.entity.FeedEvent;
import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RateableItem;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedEventRepository extends JpaRepository<FeedEvent, Long> {
    long countByActorUser(User actorUser);
    void deleteByRatingOrRateableItem(Rating rating, RateableItem rateableItem);
    void deleteByActorUser(User actorUser);
}
