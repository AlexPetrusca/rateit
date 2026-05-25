package com.rateit.backend.repository;

import com.rateit.backend.entity.RatingScale;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RatingScaleRepository extends JpaRepository<RatingScale, Long> {

    @Query("""
        select s
        from RatingScale s
        where s.isDefault = true
        order by s.createdAt asc
        """)
    Optional<RatingScale> findDefaultScale();

    long countByOwnerUser(User ownerUser);
}
