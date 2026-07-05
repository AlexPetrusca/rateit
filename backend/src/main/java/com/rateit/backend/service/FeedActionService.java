package com.rateit.backend.service;

import com.rateit.backend.entity.MediaAsset;
import com.rateit.backend.entity.RateableItem;
import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingComment;
import com.rateit.backend.entity.RatingCommentLike;
import com.rateit.backend.entity.RatingLike;
import com.rateit.backend.entity.RatingScale;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.FeedItemDto;
import com.rateit.backend.entity.dto.PromptDto;
import com.rateit.backend.entity.dto.RatingCommentDto;
import com.rateit.backend.entity.dto.DraftDto;
import com.rateit.backend.entity.rest.CreateRatingRequest;
import com.rateit.backend.entity.rest.CreatePromptRequest;
import com.rateit.backend.entity.rest.CreateRatingCommentRequest;
import com.rateit.backend.entity.rest.CreateRerateRequest;
import com.rateit.backend.entity.rest.SaveDraftRequest;
import com.rateit.backend.entity.rest.UpdateRatingCommentRequest;
import com.rateit.backend.entity.rest.UpdateRatingRequest;
import com.rateit.backend.entity.types.RateableItemType;
import com.rateit.backend.entity.types.RatingScaleType;
import com.rateit.backend.entity.types.RatingStatus;
import com.rateit.backend.entity.types.Resource;
import com.rateit.backend.entity.types.Visibility;
import com.rateit.backend.exception.BadRequestException;
import com.rateit.backend.exception.AuthorizationException;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.repository.MediaAssetRepository;
import com.rateit.backend.repository.ExternalReviewRepository;
import com.rateit.backend.repository.FeedEventRepository;
import com.rateit.backend.repository.RatingCommentRepository;
import com.rateit.backend.repository.RatingCommentLikeRepository;
import com.rateit.backend.repository.RatingLikeRepository;
import com.rateit.backend.repository.RatingScaleRepository;
import com.rateit.backend.repository.RatingRepository;
import com.rateit.backend.repository.RateableItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FeedActionService {

    private final RatingRepository ratingRepository;
    private final RatingLikeRepository ratingLikeRepository;
    private final RatingCommentRepository ratingCommentRepository;
    private final RatingCommentLikeRepository ratingCommentLikeRepository;
    private final RatingScaleRepository ratingScaleRepository;
    private final RateableItemRepository rateableItemRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final FeedEventRepository feedEventRepository;
    private final ExternalReviewRepository externalReviewRepository;
    private final UserService userService;

    @Transactional
    public FeedItemDto createRating(CreateRatingRequest request, String currentUserPhoneNumber) {
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        RatingScale ratingScale = resolveRatingScale();

        String body = normalize(request.body());
        String reviewText = normalize(request.reviewText());
        String mediaObjectKey = normalize(request.mediaObjectKey());
        String mediaContentType = normalize(request.mediaContentType());
        boolean hasMedia = mediaObjectKey != null;

        if (!hasMedia && body == null) {
            throw BadRequestException.invalidRating("Text posts need body text or an image");
        }

        MediaAsset mediaAsset = null;
        if (hasMedia) {
            mediaAsset = mediaAssetRepository.save(MediaAsset.builder()
                .ownerUser(currentUser)
                .bucket("images")
                .objectKey(mediaObjectKey)
                .contentType(mediaContentType)
                .build());
        }

        RateableItem rateableItem = rateableItemRepository.save(RateableItem.builder()
            .createdByUser(currentUser)
            .itemType(hasMedia ? RateableItemType.PHOTO : RateableItemType.TEXT_POST)
            .body(body)
            .mediaAsset(mediaAsset)
            .visibility(Visibility.PUBLIC)
            .build());

        Rating savedRating = ratingRepository.save(Rating.builder()
            .authorUser(currentUser)
            .rateableItem(rateableItem)
            .ratingScale(ratingScale)
            .score(request.score())
            .reviewText(reviewText)
            .visibility(Visibility.PUBLIC)
            .status(RatingStatus.PUBLISHED)
            .build());

        return FeedItemDto.fromRating(savedRating, 0, 0, false);
    }

    @Transactional
    public PromptDto createPrompt(CreatePromptRequest request, String currentUserPhoneNumber) {
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        String body = normalize(request.body());
        String mediaObjectKey = normalize(request.mediaObjectKey());

        if (body == null && mediaObjectKey == null) {
            throw BadRequestException.invalidRequest("Prompts need text or an image");
        }

        MediaAsset mediaAsset = null;
        if (mediaObjectKey != null) {
            mediaAsset = mediaAssetRepository.save(MediaAsset.builder()
                .ownerUser(currentUser)
                .bucket("images")
                .objectKey(mediaObjectKey)
                .contentType(normalize(request.mediaContentType()))
                .build());
        }

        return PromptDto.from(rateableItemRepository.save(RateableItem.builder()
            .createdByUser(currentUser)
            .itemType(RateableItemType.PROMPT)
            .body(body)
            .mediaAsset(mediaAsset)
            .visibility(Visibility.PUBLIC)
            .build()));
    }

    @Transactional
    public PromptDto updatePrompt(Long promptId, CreatePromptRequest request, String currentUserPhoneNumber) {
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        RateableItem item = findOwnedPrompt(promptId, currentUser);

        String body = normalize(request.body());
        String mediaObjectKey = normalize(request.mediaObjectKey());
        if (body == null && mediaObjectKey == null) {
            throw BadRequestException.invalidRequest("Prompts need text or an image");
        }

        item.setBody(body);
        String currentKey = item.getMediaAsset() == null ? null : item.getMediaAsset().getObjectKey();
        if (mediaObjectKey == null) {
            item.setMediaAsset(null);
        } else if (!mediaObjectKey.equals(currentKey)) {
            item.setMediaAsset(mediaAssetRepository.save(MediaAsset.builder()
                .ownerUser(currentUser)
                .bucket("images")
                .objectKey(mediaObjectKey)
                .contentType(normalize(request.mediaContentType()))
                .build()));
        }

        return PromptDto.from(rateableItemRepository.save(item));
    }

    @Transactional
    public void deletePrompt(Long promptId, String currentUserPhoneNumber) {
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        RateableItem item = findOwnedPrompt(promptId, currentUser);
        // Soft-delete: hide from the public prompt queries. Ratings on it (if any)
        // are left intact rather than cascading a hard delete.
        item.setVisibility(Visibility.PRIVATE);
        rateableItemRepository.save(item);
    }

    private RateableItem findOwnedPrompt(Long promptId, User currentUser) {
        RateableItem item = rateableItemRepository.findById(promptId)
            .filter(it -> it.getItemType() == RateableItemType.PROMPT)
            .orElseThrow(() -> BadRequestException.invalidRequest("Prompt not found"));
        if (!item.getCreatedByUser().getId().equals(currentUser.getId())) {
            throw BadRequestException.invalidRequest("You can only edit your own prompts");
        }
        return item;
    }

    @Transactional
    public FeedItemDto updateRating(Long ratingId, UpdateRatingRequest request, String currentUserPhoneNumber) {
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        Rating rating = findEditableRating(ratingId, currentUser);
        RateableItem item = rating.getRateableItem();

        String body = normalize(request.body());
        String reviewText = normalize(request.reviewText());
        boolean hasMedia = item.getMediaAsset() != null;

        if (!hasMedia && body == null) {
            throw BadRequestException.invalidRating("Text posts need body text or an image");
        }

        validateScore(request.score(), rating);

        item.setBody(body);
        rating.setReviewText(reviewText);
        rating.setScore(request.score());

        rateableItemRepository.save(item);
        Rating savedRating = ratingRepository.save(rating);

        long likeCount = ratingLikeRepository.countByRating(savedRating);
        long commentCount = ratingCommentRepository.countByRating(savedRating);
        boolean likedByCurrentUser = ratingLikeRepository.findByRatingAndUser(
            savedRating,
            currentUser
        ).isPresent();

        return FeedItemDto.fromRating(savedRating, likeCount, commentCount, likedByCurrentUser);
    }

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
    public void deleteRating(Long ratingId, String currentUserPhoneNumber) {
        Rating rating = findEditableRating(ratingId, userService.findByPhoneNumber(currentUserPhoneNumber));
        RateableItem item = rating.getRateableItem();
        long commentCount = ratingCommentRepository.countByRating(rating);

        feedEventRepository.deleteByRatingOrRateableItem(rating, item);
        externalReviewRepository.deleteByRatingOrRateableItem(rating, item);
        ratingLikeRepository.deleteByRating(rating);

        if (commentCount == 0) {
            ratingRepository.delete(rating);
        } else if (rating.getDeletedAt() == null) {
            rating.setDeletedAt(java.time.Instant.now());
            ratingRepository.save(rating);
        }
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

        RatingComment savedComment = ratingCommentRepository.save(comment);
        return toDto(savedComment, currentUser);
    }

    @Transactional(readOnly = true)
    public List<RatingCommentDto> listComments(Long ratingId, String currentUserPhoneNumber) {
        Rating rating = findRating(ratingId);
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        List<RatingComment> comments = ratingCommentRepository.findThreadByRatingOrderByCreatedAtAsc(rating);
        Map<Long, List<RatingComment>> repliesByParentId = new LinkedHashMap<>();
        Map<Long, Long> likeCountsByCommentId = loadCommentLikeCounts(comments);
        Map<Long, Boolean> likedCommentIds = loadLikedCommentIds(currentUser, comments);
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
            .map(comment -> toThreadDto(comment, repliesByParentId, likeCountsByCommentId, likedCommentIds, currentUser))
            .toList();
    }

    @Transactional
    public RatingCommentDto likeComment(Long commentId, String currentUserPhoneNumber) {
        RatingComment comment = findComment(commentId);
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);

        if (ratingCommentLikeRepository.existsByCommentAndUser(comment, currentUser)) {
            return toDto(comment, currentUser);
        }

        ratingCommentLikeRepository.save(RatingCommentLike.builder()
            .comment(comment)
            .user(currentUser)
            .build());

        return toDto(comment, currentUser);
    }

    @Transactional
    public RatingCommentDto unlikeComment(Long commentId, String currentUserPhoneNumber) {
        RatingComment comment = findComment(commentId);
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);

        ratingCommentLikeRepository.findByCommentAndUser(comment, currentUser)
            .ifPresent(ratingCommentLikeRepository::delete);

        return toDto(comment, currentUser);
    }

    @Transactional
    public RatingCommentDto updateComment(Long commentId, UpdateRatingCommentRequest request, String currentUserPhoneNumber) {
        RatingComment comment = findComment(commentId);
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);

        if (!comment.getAuthorUser().getId().equals(currentUser.getId())) {
            throw AuthorizationException.forbidden("You can only edit your own comments");
        }

        if (comment.getRating().getDeletedAt() != null) {
            throw BadRequestException.invalidRequest("Comments on deleted posts cannot be edited");
        }

        validateScore(request.score(), comment.getRating());
        comment.setText(request.text().trim());
        comment.setScore(request.score());

        return toDto(ratingCommentRepository.save(comment), currentUser);
    }

    // Authors delete their own comments; this removes the comment and its whole
    // reply subtree (comments are hard-deleted, matching the admin delete). Admins
    // still moderate others' comments from the admin panel.
    @Transactional
    public void deleteComment(Long commentId, String currentUserPhoneNumber) {
        RatingComment comment = findComment(commentId);
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);

        if (!comment.getAuthorUser().getId().equals(currentUser.getId())) {
            throw AuthorizationException.forbidden("You can only delete your own comments");
        }

        deleteCommentSubtree(comment);
        ratingCommentRepository.flush();
    }

    private void deleteCommentSubtree(RatingComment comment) {
        for (RatingComment reply : ratingCommentRepository.findByParentCommentOrderByCreatedAtAsc(comment)) {
            deleteCommentSubtree(reply);
        }
        ratingCommentRepository.delete(comment);
    }

    @Transactional
    public FeedItemDto rerate(Long sourceRatingId, CreateRerateRequest request, String currentUserPhoneNumber) {
        Rating sourceRating = findRating(sourceRatingId);
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);

        Rating newRating = Rating.builder()
            .authorUser(currentUser)
            .rateableItem(sourceRating.getRateableItem())
            .ratingScale(sourceRating.getRatingScale())
            .score(request.score())
            .reviewText(normalize(request.reviewText()))
            .visibility(sourceRating.getVisibility())
            .status(RatingStatus.PUBLISHED)
            .build();

        Rating savedRating = ratingRepository.save(newRating);
        return FeedItemDto.fromRating(savedRating, 0, 0, false);
    }

    @Transactional
    public FeedItemDto rateTopic(Long rateableItemId, CreateRerateRequest request, String currentUserPhoneNumber) {
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        RateableItem item = rateableItemRepository.findById(rateableItemId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.RATEABLE_ITEM, rateableItemId));
        RatingScale scale = resolveRatingScale();

        if (request.score().compareTo(scale.getMinValue()) < 0 || request.score().compareTo(scale.getMaxValue()) > 0) {
            throw BadRequestException.invalidRating(
                String.format("Score must be between %s and %s", scale.getMinValue(), scale.getMaxValue())
            );
        }

        Rating savedRating = ratingRepository.save(Rating.builder()
            .authorUser(currentUser)
            .rateableItem(item)
            .ratingScale(scale)
            .score(request.score())
            .reviewText(normalize(request.reviewText()))
            .visibility(Visibility.PUBLIC)
            .status(RatingStatus.PUBLISHED)
            .build());

        return FeedItemDto.fromRating(savedRating, 0, 0, false);
    }

    @Transactional
    public DraftDto saveDraft(SaveDraftRequest request, String currentUserPhoneNumber) {
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);

        Rating draft;
        if (request.id() != null) {
            draft = findRating(request.id());
            if (!draft.getAuthorUser().getId().equals(currentUser.getId())) {
                throw AuthorizationException.forbidden("You can only edit your own drafts");
            }
            if (draft.getStatus() != RatingStatus.DRAFT) {
                throw BadRequestException.invalidRequest("Cannot overwrite a published rating as a draft");
            }
        } else {
            draft = Rating.builder()
                .authorUser(currentUser)
                .ratingScale(resolveRatingScale())
                .visibility(Visibility.PUBLIC)
                .status(RatingStatus.DRAFT)
                .build();
        }

        draft.setDraftBody(normalize(request.body()));
        draft.setReviewText(normalize(request.reviewText()));
        draft.setScore(request.score());
        draft.setDraftMediaKey(normalize(request.mediaObjectKey()));
        draft.setDraftMediaType(normalize(request.mediaContentType()));

        return DraftDto.from(ratingRepository.save(draft));
    }

    @Transactional(readOnly = true)
    public java.util.List<DraftDto> listDrafts(String currentUserPhoneNumber) {
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        return ratingRepository.findDraftsByAuthorUser(currentUser, RatingStatus.DRAFT)
            .stream()
            .map(DraftDto::from)
            .toList();
    }

    @Transactional
    public void deleteDraft(Long draftId, String currentUserPhoneNumber) {
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        Rating draft = findRating(draftId);
        if (!draft.getAuthorUser().getId().equals(currentUser.getId())) {
            throw AuthorizationException.forbidden("You can only delete your own drafts");
        }
        if (draft.getStatus() != RatingStatus.DRAFT) {
            throw BadRequestException.invalidRequest("Cannot delete a published rating as a draft");
        }
        ratingRepository.delete(draft);
    }

    @Transactional
    public FeedItemDto publishDraft(Long draftId, String currentUserPhoneNumber) {
        User currentUser = userService.findByPhoneNumber(currentUserPhoneNumber);
        Rating draft = findRating(draftId);

        if (!draft.getAuthorUser().getId().equals(currentUser.getId())) {
            throw AuthorizationException.forbidden("You can only publish your own drafts");
        }
        if (draft.getStatus() != RatingStatus.DRAFT) {
            throw BadRequestException.invalidRequest("Rating is already published");
        }

        String body = draft.getDraftBody();
        String mediaKey = draft.getDraftMediaKey();
        boolean hasMedia = mediaKey != null;

        if (!hasMedia && body == null) {
            throw BadRequestException.invalidRating("Text posts need body text or an image");
        }
        if (draft.getScore() == null) {
            throw BadRequestException.invalidRating("Score is required to publish");
        }

        MediaAsset mediaAsset = null;
        if (hasMedia) {
            mediaAsset = mediaAssetRepository.save(MediaAsset.builder()
                .ownerUser(currentUser)
                .bucket("images")
                .objectKey(mediaKey)
                .contentType(draft.getDraftMediaType())
                .build());
        }

        RateableItem rateableItem = rateableItemRepository.save(RateableItem.builder()
            .createdByUser(currentUser)
            .itemType(hasMedia ? RateableItemType.PHOTO : RateableItemType.TEXT_POST)
            .body(body)
            .mediaAsset(mediaAsset)
            .visibility(Visibility.PUBLIC)
            .build());

        draft.setRateableItem(rateableItem);
        draft.setStatus(RatingStatus.PUBLISHED);
        draft.setDraftBody(null);
        draft.setDraftMediaKey(null);
        draft.setDraftMediaType(null);

        Rating published = ratingRepository.save(draft);
        return FeedItemDto.fromRating(published, 0, 0, false);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private RatingScale resolveRatingScale() {
        return ratingScaleRepository.findDefaultScale()
            .or(() -> ratingScaleRepository.findAll().stream().findFirst())
            .orElseGet(() -> ratingScaleRepository.save(RatingScale.builder()
                .name("5 stars")
                .scaleType(RatingScaleType.STARS)
                .minValue(new java.math.BigDecimal("0.5"))
                .maxValue(new java.math.BigDecimal("5"))
                .step(new java.math.BigDecimal("0.5"))
                .symbol("star")
                .isDefault(true)
                .build()));
    }

    private Rating findRating(Long ratingId) {
        return ratingRepository.findById(ratingId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.RATING, ratingId));
    }

    private RatingComment findComment(Long commentId) {
        return ratingCommentRepository.findById(commentId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.RATING_COMMENT, commentId));
    }

    private Rating findEditableRating(Long ratingId, User currentUser) {
        Rating rating = findRating(ratingId);

        if (!rating.getAuthorUser().getId().equals(currentUser.getId())) {
            throw AuthorizationException.forbidden("You can only edit your own posts");
        }

        if (rating.getDeletedAt() != null) {
            throw BadRequestException.invalidRequest("Deleted posts cannot be edited");
        }

        return rating;
    }

    private void validateScore(java.math.BigDecimal score, Rating rating) {
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
        Map<Long, List<RatingComment>> repliesByParentId,
        Map<Long, Long> likeCountsByCommentId,
        Map<Long, Boolean> likedCommentIds,
        User currentUser
    ) {
        List<RatingCommentDto> replies = repliesByParentId.getOrDefault(comment.getId(), List.of())
            .stream()
            .map(reply -> toThreadDto(reply, repliesByParentId, likeCountsByCommentId, likedCommentIds, currentUser))
            .toList();

        return RatingCommentDto.fromComment(
            comment,
            likeCountsByCommentId.getOrDefault(comment.getId(), 0L),
            likedCommentIds.getOrDefault(comment.getId(), false),
            replies
        );
    }

    private RatingCommentDto toDto(RatingComment comment, User currentUser) {
        long likeCount = ratingCommentLikeRepository.countByComment(comment);
        boolean likedByCurrentUser = ratingCommentLikeRepository.existsByCommentAndUser(comment, currentUser);
        return RatingCommentDto.fromComment(comment, likeCount, likedByCurrentUser, List.of());
    }

    private Map<Long, Long> loadCommentLikeCounts(List<RatingComment> comments) {
        List<Long> commentIds = comments.stream().map(RatingComment::getId).toList();
        Map<Long, Long> likeCounts = new LinkedHashMap<>();

        if (commentIds.isEmpty()) {
            return likeCounts;
        }

        ratingCommentLikeRepository.countLikesByCommentIds(commentIds).forEach(row ->
            likeCounts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue())
        );
        return likeCounts;
    }

    private Map<Long, Boolean> loadLikedCommentIds(User currentUser, List<RatingComment> comments) {
        List<Long> commentIds = comments.stream().map(RatingComment::getId).toList();
        Map<Long, Boolean> likedCommentIds = new LinkedHashMap<>();

        if (commentIds.isEmpty()) {
            return likedCommentIds;
        }

        ratingCommentLikeRepository.findLikedCommentIdsByUserAndCommentIds(currentUser, commentIds)
            .forEach(commentId -> likedCommentIds.put(commentId, true));
        return likedCommentIds;
    }
}
