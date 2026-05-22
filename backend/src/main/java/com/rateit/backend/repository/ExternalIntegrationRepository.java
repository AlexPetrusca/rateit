package com.rateit.backend.repository;

import com.rateit.backend.entity.ExternalIntegration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExternalIntegrationRepository extends JpaRepository<ExternalIntegration, Long> {
}
