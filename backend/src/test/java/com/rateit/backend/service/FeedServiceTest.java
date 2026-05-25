package com.rateit.backend.service;

import com.rateit.backend.entity.RateableItem;
import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingScale;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.FeedItemDto;
import com.rateit.backend.entity.types.RateableItemType;
import com.rateit.backend.entity.types.RatingScaleType;
import com.rateit.backend.entity.types.Visibility;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.repository.RatingCommentRepository;
import com.rateit.backend.repository.RatingLikeRepository;
import com.rateit.backend.repository.RatingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

    @Mock
    private RatingRepository ratingRepository;

    @Mock
    private RatingLikeRepository ratingLikeRepository;

    @Mock
    private RatingCommentRepository ratingCommentRepository;

    @Mock
    private UserService userService;

    private FeedService feedService;

    @BeforeEach
    void setUp() {
        feedService = new FeedService(
            ratingRepository,
            ratingLikeRepository,
            ratingCommentRepository,
            userService
        );
    }

    @Test
    void getProfileRatingsIncludesPrivatePostsForOwner() {
        User owner = user(1L, "+15550000001", "alpha");
        RatingScale scale = ratingScale(2L);
        RateableItem item = rateableItem(3L, owner, "Owner body", Visibility.PRIVATE);
        Rating rating = rating(4L, owner, item, scale, "Owner review", Visibility.PRIVATE);

        when(userService.findByPhoneNumber(owner.getPhoneNumber())).thenReturn(owner);
        when(userService.findById(1L)).thenReturn(owner);
        when(ratingRepository.findProfilePageByAuthorUser(owner, PageRequest.of(0, 5)))
            .thenReturn(new PageImpl<>(List.of(rating), PageRequest.of(0, 5), 1));
        when(ratingLikeRepository.countByRating(rating)).thenReturn(2L);
        when(ratingCommentRepository.countByRating(rating)).thenReturn(1L);
        when(ratingLikeRepository.existsByRatingAndUser(rating, owner)).thenReturn(true);

        var page = feedService.getProfileRatings(1L, 5, 0, owner.getPhoneNumber());

        FeedItemDto itemDto = page.getContent().get(0);
        assertEquals(1, page.getTotalElements());
        assertEquals(owner.getId(), itemDto.author().userId());
        assertEquals("alpha", itemDto.author().username());
        assertEquals("Owner body", itemDto.rateableItem().body());
        assertTrue(itemDto.likedByCurrentUser());
    }

    @Test
    void getProfileRatingsOnlyReturnsPublicPostsForOtherViewers() {
        User viewer = user(9L, "+15550000099", "viewer");
        User owner = user(1L, "+15550000001", "alpha");
        RatingScale scale = ratingScale(2L);
        RateableItem item = rateableItem(3L, owner, "Public body", Visibility.PUBLIC);
        Rating rating = rating(4L, owner, item, scale, "Public review", Visibility.PUBLIC);

        when(userService.findByPhoneNumber(viewer.getPhoneNumber())).thenReturn(viewer);
        when(userService.findById(1L)).thenReturn(owner);
        when(ratingRepository.findProfilePageByAuthorUserAndVisibility(owner, Visibility.PUBLIC, PageRequest.of(0, 5)))
            .thenReturn(new PageImpl<>(List.of(rating), PageRequest.of(0, 5), 1));
        when(ratingLikeRepository.countByRating(rating)).thenReturn(0L);
        when(ratingCommentRepository.countByRating(rating)).thenReturn(0L);
        when(ratingLikeRepository.existsByRatingAndUser(rating, viewer)).thenReturn(false);

        var page = feedService.getProfileRatings(1L, 5, 0, viewer.getPhoneNumber());

        FeedItemDto itemDto = page.getContent().get(0);
        assertEquals(1, page.getTotalElements());
        assertEquals(owner.getId(), itemDto.author().userId());
        assertFalse(itemDto.likedByCurrentUser());
    }

    @Test
    void getRatingReturnsCurrentUserViewModel() {
        User viewer = user(9L, "+15550000099", "viewer");
        User owner = user(1L, "+15550000001", "alpha");
        RatingScale scale = ratingScale(2L);
        RateableItem item = rateableItem(3L, owner, "Body", Visibility.PUBLIC);
        Rating rating = rating(4L, owner, item, scale, "Review", Visibility.PUBLIC);

        when(userService.findByPhoneNumber(viewer.getPhoneNumber())).thenReturn(viewer);
        when(ratingRepository.findById(4L)).thenReturn(Optional.of(rating));
        when(ratingLikeRepository.countByRating(rating)).thenReturn(5L);
        when(ratingCommentRepository.countByRating(rating)).thenReturn(2L);
        when(ratingLikeRepository.existsByRatingAndUser(rating, viewer)).thenReturn(true);

        FeedItemDto result = feedService.getRating(4L, viewer.getPhoneNumber());

        assertEquals(4L, result.ratingId());
        assertEquals(owner.getId(), result.author().userId());
        assertEquals(5L, result.likeCount());
        assertTrue(result.likedByCurrentUser());
    }

    @Test
    void getRatingThrowsWhenMissing() {
        User viewer = user(9L, "+15550000099", "viewer");

        when(userService.findByPhoneNumber(viewer.getPhoneNumber())).thenReturn(viewer);
        when(ratingRepository.findById(404L)).thenReturn(Optional.empty());

        org.junit.jupiter.api.Assertions.assertThrows(
            ResourceNotFoundException.class,
            () -> feedService.getRating(404L, viewer.getPhoneNumber())
        );
    }

    private User user(Long id, String phoneNumber, String username) {
        User user = User.builder()
            .phoneNumber(phoneNumber)
            .username(username)
            .profilePicUrl("profile.png")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private RatingScale ratingScale(Long id) {
        RatingScale scale = RatingScale.builder()
            .name("5 stars")
            .scaleType(RatingScaleType.STARS)
            .minValue(new BigDecimal("1"))
            .maxValue(new BigDecimal("5"))
            .step(new BigDecimal("0.5"))
            .symbol("star")
            .isDefault(true)
            .build();
        ReflectionTestUtils.setField(scale, "id", id);
        return scale;
    }

    private RateableItem rateableItem(Long id, User author, String body, Visibility visibility) {
        RateableItem item = RateableItem.builder()
            .createdByUser(author)
            .itemType(RateableItemType.TEXT_POST)
            .body(body)
            .visibility(visibility)
            .build();
        ReflectionTestUtils.setField(item, "id", id);
        ReflectionTestUtils.setField(item, "createdAt", Instant.parse("2026-01-01T00:00:00Z"));
        return item;
    }

    private Rating rating(Long id, User author, RateableItem item, RatingScale scale, String reviewText, Visibility visibility) {
        Rating rating = Rating.builder()
            .authorUser(author)
            .rateableItem(item)
            .ratingScale(scale)
            .score(new BigDecimal("4.5"))
            .reviewText(reviewText)
            .visibility(visibility)
            .build();
        ReflectionTestUtils.setField(rating, "id", id);
        ReflectionTestUtils.setField(rating, "createdAt", Instant.parse("2026-01-01T00:00:00Z"));
        return rating;
    }
}
