package com.rateit.backend.repository;

import com.rateit.backend.entity.RatingScale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RatingScaleRepository extends JpaRepository<RatingScale, Long> {
}
