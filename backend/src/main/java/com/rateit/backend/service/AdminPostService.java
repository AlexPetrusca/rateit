package com.rateit.backend.service;

import com.rateit.backend.entity.MediaAsset;
import com.rateit.backend.entity.RateableItem;
import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingComment;
import com.rateit.backend.entity.dto.AdminPostDto;
import com.rateit.backend.entity.dto.AdminDeletePostsResultDto;
import com.rateit.backend.entity.rest.UpdateAdminPostRequest;
import com.rateit.backend.entity.types.Resource;
import com.rateit.backend.entity.types.Visibility;
import com.rateit.backend.exception.BadRequestException;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.repository.ExternalReviewRepository;
import com.rateit.backend.repository.FeedEventRepository;
import com.rateit.backend.repository.MediaAssetRepository;
import com.rateit.backend.repository.RateableItemRepository;
import com.rateit.backend.repository.RatingCommentRepository;
import com.rateit.backend.repository.RatingLikeRepository;
import com.rateit.backend.repository.RatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminPostService {

    private final RatingRepository ratingRepository;
    private final RatingLikeRepository ratingLikeRepository;
    private final RatingCommentRepository ratingCommentRepository;
    private final RateableItemRepository rateableItemRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final FeedEventRepository feedEventRepository;
    private final ExternalReviewRepository externalReviewRepository;

    @Transactional(readOnly = true)
    public Page<AdminPostDto> list(Pageable pageable) {
        return ratingRepository.findAdminPage(pageable)
            .map(rating -> AdminPostDto.fromRating(
                rating,
                ratingLikeRepository.countByRating(rating),
                ratingCommentRepository.countByRating(rating)
            ));
    }

    @Transactional
    public AdminPostDto updateAdminPost(long postId, UpdateAdminPostRequest request) {
        Rating rating = findRating(postId);
        RateableItem item = rating.getRateableItem();

        BigDecimal score = request.score();
        Visibility visibility = request.visibility();
        if (visibility == null) {
            throw BadRequestException.invalidRequest("Visibility is required");
        }
        validateScore(score, rating);

        item.setBody(normalizeOptional(request.body()));
        rating.setReviewText(normalizeOptional(request.reviewText()));
        rating.setScore(score);
        rating.setVisibility(visibility);
        item.setVisibility(visibility);

        rateableItemRepository.save(item);
        Rating savedRating = ratingRepository.save(rating);

        return AdminPostDto.fromRating(
            savedRating,
            ratingLikeRepository.countByRating(savedRating),
            ratingCommentRepository.countByRating(savedRating)
        );
    }

    @Transactional
    public void deleteAdminPost(long postId) {
        Rating rating = findRating(postId);

        RateableItem item = rating.getRateableItem();
        MediaAsset mediaAsset = item.getMediaAsset();

        feedEventRepository.deleteByRatingOrRateableItem(rating, item);
        externalReviewRepository.deleteByRatingOrRateableItem(rating, item);
        ratingLikeRepository.deleteByRating(rating);
        deleteCommentsInReverseOrder(rating);

        ratingRepository.delete(rating);
        ratingRepository.flush();
        rateableItemRepository.delete(item);
        rateableItemRepository.flush();

        if (mediaAsset != null) {
            mediaAssetRepository.delete(mediaAsset);
            mediaAssetRepository.flush();
        }
    }

    @Transactional
    public AdminDeletePostsResultDto deleteAdminPosts(List<Long> postIds) {
        int deletedCount = 0;

        for (Long postId : postIds) {
            deleteAdminPost(postId);
            deletedCount++;
        }

        return new AdminDeletePostsResultDto(deletedCount);
    }

    private void deleteCommentsInReverseOrder(Rating rating) {
        List<RatingComment> comments = new ArrayList<>(ratingCommentRepository.findByRatingOrderByCreatedAtAsc(rating));
        Collections.reverse(comments);
        comments.forEach(ratingCommentRepository::delete);
    }

    private void validateScore(BigDecimal score, Rating rating) {
        if (score == null) {
            throw BadRequestException.invalidRating("Score is required");
        }

        if (score.compareTo(rating.getRatingScale().getMinValue()) < 0 || score.compareTo(rating.getRatingScale().getMaxValue()) > 0) {
            throw BadRequestException.invalidRating(
                String.format(
                    "Score must be between %s and %s",
                    rating.getRatingScale().getMinValue(),
                    rating.getRatingScale().getMaxValue()
                )
            );
        }
    }

    private Rating findRating(long postId) {
        return ratingRepository.findById(postId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.RATING, postId));
    }

    private String normalizeOptional(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
