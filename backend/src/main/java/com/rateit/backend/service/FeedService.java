package com.rateit.backend.service;

import com.rateit.backend.entity.dto.FeedItemDto;
import com.rateit.backend.entity.types.Visibility;
import com.rateit.backend.repository.RatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FeedService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;

    private final RatingRepository ratingRepository;

    @Transactional(readOnly = true)
    public List<FeedItemDto> getRecentRatings(Integer requestedLimit) {
        int limit = normalizeLimit(requestedLimit);

        return ratingRepository.findRecentByVisibility(Visibility.PUBLIC, PageRequest.of(0, limit))
            .stream()
            .map(FeedItemDto::fromRating)
            .toList();
    }

    private int normalizeLimit(Integer requestedLimit) {
        if (requestedLimit == null) {
            return DEFAULT_LIMIT;
        }

        if (requestedLimit < 1) {
            return 1;
        }

        return Math.min(requestedLimit, MAX_LIMIT);
    }
}
