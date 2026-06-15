package com.rateit.backend.service;

import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingComment;
import com.rateit.backend.entity.dto.AdminCommentDto;
import com.rateit.backend.entity.rest.UpdateAdminCommentRequest;
import com.rateit.backend.entity.types.Resource;
import com.rateit.backend.exception.BadRequestException;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.repository.RatingCommentRepository;
import com.rateit.backend.repository.RatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminCommentService {

    private final RatingCommentRepository ratingCommentRepository;
    private final RatingRepository ratingRepository;

    @Transactional(readOnly = true)
    public Page<AdminCommentDto> list(Pageable pageable) {
        return ratingCommentRepository.findAdminPage(pageable)
            .map(AdminCommentDto::fromComment);
    }

    @Transactional
    public AdminCommentDto updateAdminComment(long commentId, UpdateAdminCommentRequest request) {
        RatingComment comment = findComment(commentId);
        Rating rating = comment.getRating();

        BigDecimal score = request.score();
        validateScore(score, rating);

        comment.setText(normalizeRequired(request.text(), "text"));
        comment.setScore(score);

        return AdminCommentDto.fromComment(ratingCommentRepository.save(comment));
    }

    @Transactional
    public void deleteAdminComment(long commentId) {
        RatingComment target = findComment(commentId);
        List<RatingComment> comments = new ArrayList<>(ratingCommentRepository.findThreadByRatingOrderByCreatedAtAsc(target.getRating()));
        Map<Long, List<RatingComment>> childrenByParentId = buildChildrenIndex(comments);
        Set<Long> deleteOrder = new LinkedHashSet<>();

        collectSubtree(target, childrenByParentId, deleteOrder);

        List<Long> deleteIds = new ArrayList<>(deleteOrder);
        for (int index = deleteIds.size() - 1; index >= 0; index -= 1) {
            ratingCommentRepository.delete(findComment(deleteIds.get(index)));
        }
        ratingCommentRepository.flush();
    }

    @Transactional
    public int deleteAdminComments(Collection<Long> commentIds) {
        if (commentIds == null || commentIds.isEmpty()) {
            return 0;
        }

        Set<Long> uniqueIds = new LinkedHashSet<>(commentIds);
        Set<Long> idsToDelete = new LinkedHashSet<>();
        Set<Long> ratingIds = new LinkedHashSet<>();

        for (Long commentId : uniqueIds) {
            if (commentId == null) {
                continue;
            }

            RatingComment target = findComment(commentId);
            ratingIds.add(target.getRating().getId());
        }

        for (Long ratingId : ratingIds) {
            Rating rating = ratingRepository.findById(ratingId)
                .orElseThrow(() -> ResourceNotFoundException.resource(Resource.RATING, ratingId));
            List<RatingComment> comments = new ArrayList<>(ratingCommentRepository.findThreadByRatingOrderByCreatedAtAsc(rating));
            Map<Long, List<RatingComment>> childrenByParentId = buildChildrenIndex(comments);

            for (Long commentId : uniqueIds) {
                RatingComment target = comments.stream()
                    .filter(comment -> comment.getId().equals(commentId))
                    .findFirst()
                    .orElse(null);

                if (target != null) {
                    collectSubtree(target, childrenByParentId, idsToDelete);
                }
            }
        }

        List<Long> deleteOrder = new ArrayList<>(idsToDelete);

        for (int index = deleteOrder.size() - 1; index >= 0; index -= 1) {
            ratingCommentRepository.delete(findComment(deleteOrder.get(index)));
        }
        ratingCommentRepository.flush();

        return deleteOrder.size();
    }

    private void collectSubtree(
        RatingComment comment,
        Map<Long, List<RatingComment>> childrenByParentId,
        Set<Long> output
    ) {
        output.add(comment.getId());

        List<RatingComment> children = childrenByParentId.getOrDefault(comment.getId(), List.of());
        for (RatingComment child : children) {
            collectSubtree(child, childrenByParentId, output);
        }
    }

    private Map<Long, List<RatingComment>> buildChildrenIndex(List<RatingComment> comments) {
        Map<Long, List<RatingComment>> childrenByParentId = new LinkedHashMap<>();

        for (RatingComment comment : comments) {
            RatingComment parent = comment.getParentComment();
            if (parent != null) {
                childrenByParentId.computeIfAbsent(parent.getId(), key -> new ArrayList<>()).add(comment);
            }
        }

        return childrenByParentId;
    }

    private RatingComment findComment(long commentId) {
        return ratingCommentRepository.findById(commentId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.RATING_COMMENT, commentId));
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

    private String normalizeRequired(String value, String fieldName) {
        if (!StringUtils.hasText(value)) {
            throw BadRequestException.invalidRequest(fieldName + " is required");
        }

        return value.trim();
    }
}
