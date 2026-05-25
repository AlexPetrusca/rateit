package com.rateit.backend.repository;

import com.rateit.backend.entity.AdminJob;
import com.rateit.backend.entity.types.AdminJobStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminJobRepository extends JpaRepository<AdminJob, Long> {
    Optional<AdminJob> findFirstByStatusOrderByCreatedAtAsc(AdminJobStatus status);

    List<AdminJob> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
