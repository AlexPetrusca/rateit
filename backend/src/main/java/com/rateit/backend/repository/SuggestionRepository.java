package com.rateit.backend.repository;

import com.rateit.backend.entity.Suggestion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SuggestionRepository extends JpaRepository<Suggestion, Long> {
    Page<Suggestion> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
