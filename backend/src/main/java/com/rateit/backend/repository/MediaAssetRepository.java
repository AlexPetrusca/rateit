package com.rateit.backend.repository;

import com.rateit.backend.entity.MediaAsset;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {
    long countByOwnerUser(User ownerUser);
}
