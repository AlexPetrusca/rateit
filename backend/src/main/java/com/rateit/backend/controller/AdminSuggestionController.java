package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.SuggestionDto;
import com.rateit.backend.service.SuggestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/suggestions")
@RequiredArgsConstructor
public class AdminSuggestionController {

    private final SuggestionService suggestionService;

    @GetMapping
    public ResponseEntity<Page<SuggestionDto>> list(
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(suggestionService.listAdmin(pageable));
    }

    @DeleteMapping("/{suggestionId}")
    public ResponseEntity<Void> delete(@PathVariable long suggestionId) {
        suggestionService.deleteSuggestion(suggestionId);
        return ResponseEntity.noContent().build();
    }
}
