package com.rateit.backend.service;

import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingComment;
import com.rateit.backend.entity.RatingLike;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.FeedItemDto;
import com.rateit.backend.entity.dto.RatingCommentDto;
import com.rateit.backend.entity.rest.CreateRatingCommentRequest;
import com.rateit.backend.entity.rest.CreateRerateRequest;
import com.rateit.backend.entity.types.Resource;
import com.rateit.backend.exception.ConflictException;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.repository.RatingCommentRepository;
import com.rateit.backend.repository.RatingLikeRepository;
import com.rateit.backend.repository.RatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FeedActionService {

    private final RatingRepository ratingRepository;
    private final RatingLikeRepository ratingLikeRepository;
    private final RatingCommentRepository ratingCommentRepository;
    private final UserService userService;

    @Transactional
    public void likeRating(Long ratingId, String currentUserPhoneNumber) {
        Rating rating = findRating(ratingId);
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);

        if (ratingLikeRepository.existsByRatingAndUser(rating, currentUser)) {
            return;
        }

        RatingLike like = RatingLike.builder()
            .rating(rating)
            .user(currentUser)
            .build();
        ratingLikeRepository.save(like);
    }

    @Transactional
    public void unlikeRating(Long ratingId, String currentUserPhoneNumber) {
        Rating rating = findRating(ratingId);
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);

        ratingLikeRepository.findByRatingAndUser(rating, currentUser)
            .ifPresent(ratingLikeRepository::delete);
    }

    @Transactional
    public RatingCommentDto createComment(
        Long ratingId,
        CreateRatingCommentRequest request,
        String currentUserPhoneNumber
    ) {
        Rating rating = findRating(ratingId);
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        RatingComment parentComment = findParentComment(rating, request.parentCommentId());

        RatingComment comment = RatingComment.builder()
            .rating(rating)
            .authorUser(currentUser)
            .parentComment(parentComment)
            .text(request.text().trim())
            .score(request.score())
            .build();

        return RatingCommentDto.fromComment(ratingCommentRepository.save(comment));
    }

    @Transactional(readOnly = true)
    public List<RatingCommentDto> listComments(Long ratingId) {
        Rating rating = findRating(ratingId);
        List<RatingComment> comments = ratingCommentRepository.findThreadByRatingOrderByCreatedAtAsc(rating);
        Map<Long, List<RatingComment>> repliesByParentId = new LinkedHashMap<>();
        List<RatingComment> rootComments = new ArrayList<>();

        for (RatingComment comment : comments) {
            RatingComment parent = comment.getParentComment();

            if (parent == null) {
                rootComments.add(comment);
            } else {
                repliesByParentId.computeIfAbsent(parent.getId(), key -> new ArrayList<>()).add(comment);
            }
        }

        return rootComments.stream()
            .map(comment -> toThreadDto(comment, repliesByParentId))
            .toList();
    }

    @Transactional
    public FeedItemDto rerate(Long sourceRatingId, CreateRerateRequest request, String currentUserPhoneNumber) {
        Rating sourceRating = findRating(sourceRatingId);
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);

        if (ratingRepository.existsByAuthorUserAndRateableItem(currentUser, sourceRating.getRateableItem())) {
            throw ConflictException.ratingAlreadyExists(sourceRating.getRateableItem().getId());
        }

        Rating newRating = Rating.builder()
            .authorUser(currentUser)
            .rateableItem(sourceRating.getRateableItem())
            .ratingScale(sourceRating.getRatingScale())
            .score(request.score())
            .reviewText(request.reviewText())
            .visibility(sourceRating.getVisibility())
            .build();

        Rating savedRating = ratingRepository.save(newRating);
        return FeedItemDto.fromRating(savedRating, 0, 0, false);
    }

    private Rating findRating(Long ratingId) {
        return ratingRepository.findById(ratingId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.RATING, ratingId));
    }

    private RatingComment findParentComment(Rating rating, Long parentCommentId) {
        if (parentCommentId == null) {
            return null;
        }

        RatingComment parentComment = ratingCommentRepository.findById(parentCommentId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.RATING_COMMENT, parentCommentId));

        if (!parentComment.getRating().getId().equals(rating.getId())) {
            throw ResourceNotFoundException.resource(Resource.RATING_COMMENT, parentCommentId);
        }

        return parentComment;
    }

    private RatingCommentDto toThreadDto(
        RatingComment comment,
        Map<Long, List<RatingComment>> repliesByParentId
    ) {
        List<RatingCommentDto> replies = repliesByParentId.getOrDefault(comment.getId(), List.of())
            .stream()
            .map(reply -> toThreadDto(reply, repliesByParentId))
            .toList();

        return RatingCommentDto.fromComment(comment, replies);
    }
}
