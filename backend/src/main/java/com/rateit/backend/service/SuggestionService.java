package com.rateit.backend.service;

import com.rateit.backend.entity.Suggestion;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.SuggestionDto;
import com.rateit.backend.entity.rest.CreateSuggestionRequest;
import com.rateit.backend.entity.types.Resource;
import com.rateit.backend.exception.BadRequestException;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.repository.SuggestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class SuggestionService {

    private final SuggestionRepository suggestionRepository;

    @Transactional(readOnly = true)
    public Page<SuggestionDto> list(Pageable pageable) {
        return suggestionRepository.findAllByOrderByCreatedAtDesc(pageable)
            .map(SuggestionDto::fromSuggestion);
    }

    @Transactional
    public SuggestionDto createSuggestion(User author, CreateSuggestionRequest request) {
        Suggestion suggestion = Suggestion.builder()
            .authorUser(author)
            .title(normalizeRequired(request.title(), "title"))
            .body(normalizeOptional(request.body()))
            .build();

        return SuggestionDto.fromSuggestion(suggestionRepository.save(suggestion));
    }

    @Transactional
    public void deleteSuggestion(long suggestionId) {
        Suggestion suggestion = findSuggestion(suggestionId);
        suggestionRepository.delete(suggestion);
        suggestionRepository.flush();
    }

    @Transactional(readOnly = true)
    public Page<SuggestionDto> listAdmin(Pageable pageable) {
        return list(pageable);
    }

    private Suggestion findSuggestion(long suggestionId) {
        return suggestionRepository.findById(suggestionId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.SUGGESTION, suggestionId));
    }

    private String normalizeRequired(String value, String fieldName) {
        if (!StringUtils.hasText(value)) {
            throw BadRequestException.invalidRequest(fieldName + " is required");
        }

        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        return value.trim();
    }
}
