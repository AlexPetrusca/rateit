package com.rateit.backend.repository;

import com.rateit.backend.entity.RateableItem;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.types.RateableItemType;
import com.rateit.backend.entity.types.Visibility;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface RateableItemRepository extends JpaRepository<RateableItem, Long> {
    @EntityGraph(attributePaths = {"createdByUser", "mediaAsset"})
    List<RateableItem> findByCreatedByUserIdAndItemTypeAndVisibilityAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
        Long userId,
        RateableItemType itemType,
        Visibility visibility,
        Instant createdAfter
    );

    @EntityGraph(attributePaths = {"createdByUser", "mediaAsset"})
    List<RateableItem> findByItemTypeAndVisibilityAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
        RateableItemType itemType,
        Visibility visibility,
        Instant createdAfter
    );

    long countByCreatedByUser(User createdByUser);
    void deleteByCreatedByUser(User createdByUser);
}
