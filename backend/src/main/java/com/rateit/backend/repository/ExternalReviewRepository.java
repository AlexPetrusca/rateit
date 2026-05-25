package com.rateit.backend.repository;

import com.rateit.backend.entity.ExternalReview;
import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RateableItem;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExternalReviewRepository extends JpaRepository<ExternalReview, Long> {
    long countByUserExternalAccount_User(User user);
    void deleteByRatingOrRateableItem(Rating rating, RateableItem rateableItem);
}
