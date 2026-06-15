package com.rateit.backend.service;

import com.rateit.backend.entity.dto.FeedItemDto;
import com.rateit.backend.entity.types.Visibility;
import com.rateit.backend.entity.Rating;
import com.rateit.backend.repository.RatingRepository;
import com.rateit.backend.repository.RatingCommentRepository;
import com.rateit.backend.repository.RatingLikeRepository;
import com.rateit.backend.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;

    private final RatingRepository ratingRepository;
    private final RatingLikeRepository ratingLikeRepository;
    private final RatingCommentRepository ratingCommentRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<FeedItemDto> getRecentRatings(Integer requestedLimit) {
        int limit = normalizeLimit(requestedLimit);

        return ratingRepository.findRecentByVisibility(Visibility.PUBLIC, PageRequest.of(0, limit))
            .stream()
            .map(FeedItemDto::fromRating)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<FeedItemDto> getRecentRatings(Integer requestedLimit, String currentUserPhoneNumber) {
        int limit = normalizeLimit(requestedLimit);
        var currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        List<Rating> ratings = ratingRepository.findRecentByVisibility(Visibility.PUBLIC, PageRequest.of(0, limit));
        return toFeedItems(ratings, currentUser);
    }

    @Transactional(readOnly = true)
    public List<FeedItemDto> getRecentRatings(Integer requestedLimit, Integer requestedPage, String currentUserPhoneNumber) {
        int limit = normalizeLimit(requestedLimit);
        int page = requestedPage == null || requestedPage < 0 ? 0 : requestedPage;
        var currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        List<Rating> ratings = ratingRepository.findRecentByVisibility(Visibility.PUBLIC, PageRequest.of(page, limit));
        return toFeedItems(ratings, currentUser);
    }

    @Transactional(readOnly = true)
    public FeedItemDto getRating(long ratingId, String currentUserPhoneNumber) {
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        var rating = ratingRepository.findById(ratingId)
            .orElseThrow(() -> com.rateit.backend.exception.ResourceNotFoundException.resource(
                com.rateit.backend.entity.types.Resource.RATING,
                ratingId
            ));

        return toFeedItems(List.of(rating), currentUser).get(0);
    }

    @Transactional(readOnly = true)
    public Page<FeedItemDto> getProfileRatings(
        long authorUserId,
        Integer requestedLimit,
        Integer requestedPage,
        String currentUserPhoneNumber
    ) {
        int limit = normalizeLimit(requestedLimit);
        int page = requestedPage == null || requestedPage < 0 ? 0 : requestedPage;
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        User authorUser = userService.findById(authorUserId);

        Page<Rating> ratingsPage;
        if (currentUser.getId().equals(authorUser.getId())) {
            ratingsPage = ratingRepository.findProfilePageByAuthorUser(authorUser, PageRequest.of(page, limit));
        } else {
            ratingsPage = ratingRepository.findProfilePageByAuthorUserAndVisibility(
                authorUser,
                Visibility.PUBLIC,
                PageRequest.of(page, limit)
            );
        }

        List<Rating> ratings = ratingsPage.getContent();
        List<FeedItemDto> feedItems = toFeedItems(ratings, currentUser);
        return new PageImpl<>(feedItems, ratingsPage.getPageable(), ratingsPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<FeedItemDto> getTopicRatings(
        long rateableItemId,
        Integer requestedLimit,
        Integer requestedPage,
        String currentUserPhoneNumber
    ) {
        int limit = normalizeLimit(requestedLimit);
        int page = requestedPage == null || requestedPage < 0 ? 0 : requestedPage;
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        List<Rating> ratings = ratingRepository.findRecentByRateableItemIdAndVisibility(
            rateableItemId,
            Visibility.PUBLIC,
            PageRequest.of(page, limit)
        );

        return toFeedItems(ratings, currentUser);
    }

    private List<FeedItemDto> toFeedItems(List<Rating> ratings, User currentUser) {
        if (ratings.isEmpty()) {
            return List.of();
        }

        List<Long> ratingIds = ratings.stream()
            .map(Rating::getId)
            .toList();

        Map<Long, Long> likeCounts = ratingLikeRepository.countLikesByRatingIds(ratingIds).stream()
            .collect(Collectors.toMap(
                row -> ((Number) row[0]).longValue(),
                row -> ((Number) row[1]).longValue()
            ));

        Map<Long, Long> commentCounts = ratingCommentRepository.countCommentsByRatingIds(ratingIds).stream()
            .collect(Collectors.toMap(
                row -> ((Number) row[0]).longValue(),
                row -> ((Number) row[1]).longValue()
            ));

        Set<Long> likedRatingIds = ratingLikeRepository.findLikedRatingIdsByUserAndRatingIds(currentUser, ratingIds)
            .stream()
            .collect(Collectors.toSet());

        return ratings.stream()
            .map(rating -> FeedItemDto.fromRating(
                rating,
                likeCounts.getOrDefault(rating.getId(), 0L),
                commentCounts.getOrDefault(rating.getId(), 0L),
                likedRatingIds.contains(rating.getId())
            ))
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
