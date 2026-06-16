package com.rateit.backend.service;

import com.rateit.backend.entity.MediaAsset;
import com.rateit.backend.entity.RateableItem;
import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingScale;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.AdminPostDto;
import com.rateit.backend.entity.rest.UpdateAdminPostRequest;
import com.rateit.backend.entity.types.RateableItemType;
import com.rateit.backend.entity.types.RatingScaleType;
import com.rateit.backend.entity.types.Visibility;
import com.rateit.backend.repository.ExternalReviewRepository;
import com.rateit.backend.repository.FeedEventRepository;
import com.rateit.backend.repository.RateableItemRepository;
import com.rateit.backend.repository.RatingCommentRepository;
import com.rateit.backend.repository.RatingLikeRepository;
import com.rateit.backend.repository.RatingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminPostServiceTest {

    @Mock
    private RatingRepository ratingRepository;

    @Mock
    private RatingLikeRepository ratingLikeRepository;

    @Mock
    private RatingCommentRepository ratingCommentRepository;

    @Mock
    private RateableItemRepository rateableItemRepository;

    @Mock
    private FeedEventRepository feedEventRepository;

    @Mock
    private ExternalReviewRepository externalReviewRepository;

    private AdminPostService adminPostService;

    @BeforeEach
    void setUp() {
        adminPostService = new AdminPostService(
            ratingRepository,
            ratingLikeRepository,
            ratingCommentRepository,
            rateableItemRepository,
            feedEventRepository,
            externalReviewRepository
        );
    }

    @Test
    void listReturnsPagedAdminPosts() {
        User author = user(1L, "+15550000001", "alpha");
        RatingScale scale = ratingScale(2L);
        RateableItem item = rateableItem(3L, author, "Body", null);
        Rating rating = rating(4L, author, item, scale, new BigDecimal("4.5"), "Nice", Visibility.PUBLIC);

        when(ratingRepository.findAdminPage(any(PageRequest.class))).thenReturn(new PageImpl<>(List.of(rating)));
        when(ratingLikeRepository.countByRating(rating)).thenReturn(7L);
        when(ratingCommentRepository.countByRating(rating)).thenReturn(3L);

        var page = adminPostService.list(PageRequest.of(0, 10));

        AdminPostDto dto = page.getContent().get(0);
        assertEquals(1, page.getTotalElements());
        assertEquals(4L, dto.ratingId());
        assertEquals("alpha", dto.authorUsername());
        assertEquals("Body", dto.body());
        assertEquals(new BigDecimal("4.5"), dto.score());
        assertEquals(Visibility.PUBLIC, dto.visibility());
        assertEquals(7L, dto.likeCount());
        assertEquals(3L, dto.commentCount());
    }

    @Test
    void updateAdminPostPersistsEditableFields() {
        User author = user(1L, "+15550000001", "alpha");
        RatingScale scale = ratingScale(2L);
        RateableItem item = rateableItem(3L, author, "Old body", null);
        Rating rating = rating(4L, author, item, scale, new BigDecimal("3"), "Old review", Visibility.PUBLIC);

        when(ratingRepository.findById(4L)).thenReturn(Optional.of(rating));
        when(rateableItemRepository.save(any(RateableItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(ratingRepository.save(any(Rating.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(ratingLikeRepository.countByRating(rating)).thenReturn(1L);
        when(ratingCommentRepository.countByRating(rating)).thenReturn(2L);

        AdminPostDto updated = adminPostService.updateAdminPost(
            4L,
            new UpdateAdminPostRequest("  New body  ", "  New review  ", new BigDecimal("4.5"), Visibility.PRIVATE)
        );

        ArgumentCaptor<RateableItem> itemCaptor = ArgumentCaptor.forClass(RateableItem.class);
        ArgumentCaptor<Rating> ratingCaptor = ArgumentCaptor.forClass(Rating.class);
        verify(rateableItemRepository).save(itemCaptor.capture());
        verify(ratingRepository).save(ratingCaptor.capture());

        RateableItem savedItem = itemCaptor.getValue();
        Rating savedRating = ratingCaptor.getValue();

        assertEquals("New body", savedItem.getBody());
        assertEquals("New review", savedRating.getReviewText());
        assertEquals(new BigDecimal("4.5"), savedRating.getScore());
        assertEquals(Visibility.PRIVATE, savedRating.getVisibility());
        assertEquals(Visibility.PRIVATE, savedItem.getVisibility());
        assertEquals(Visibility.PRIVATE, updated.visibility());
    }

    @Test
    void deleteAdminPostTombstonesRatingAndPreservesComments() {
        User author = user(1L, "+15550000001", "alpha");
        MediaAsset mediaAsset = mediaAsset(6L, author);
        RateableItem item = rateableItem(3L, author, "Body", mediaAsset);
        RatingScale scale = ratingScale(2L);
        Rating rating = rating(4L, author, item, scale, new BigDecimal("4.5"), "Review", Visibility.PUBLIC);

        when(ratingRepository.findById(4L)).thenReturn(Optional.of(rating));
        when(ratingCommentRepository.countByRating(rating)).thenReturn(1L);
        when(ratingRepository.save(any(Rating.class))).thenAnswer(invocation -> invocation.getArgument(0));

        adminPostService.deleteAdminPost(4L);

        verify(feedEventRepository).deleteByRatingOrRateableItem(rating, item);
        verify(externalReviewRepository).deleteByRatingOrRateableItem(rating, item);
        verify(ratingLikeRepository).deleteByRating(rating);
        verify(ratingRepository).save(rating);
        assertNotNull(rating.getDeletedAt());
        verify(ratingCommentRepository, never()).delete(any());
        verify(ratingRepository, never()).delete(any());
        verify(rateableItemRepository, never()).delete(any());
    }

    @Test
    void deleteAdminPostsBulkDeletesEachPost() {
        User author = user(1L, "+15550000001", "alpha");
        RateableItem firstItem = rateableItem(3L, author, "Body A", null);
        RateableItem secondItem = rateableItem(4L, author, "Body B", null);
        RatingScale scale = ratingScale(2L);
        Rating firstRating = rating(10L, author, firstItem, scale, new BigDecimal("4"), "Review A", Visibility.PUBLIC);
        Rating secondRating = rating(11L, author, secondItem, scale, new BigDecimal("5"), "Review B", Visibility.PUBLIC);

        when(ratingRepository.findById(10L)).thenReturn(Optional.of(firstRating));
        when(ratingRepository.findById(11L)).thenReturn(Optional.of(secondRating));
        when(ratingCommentRepository.countByRating(firstRating)).thenReturn(1L);
        when(ratingCommentRepository.countByRating(secondRating)).thenReturn(1L);
        when(ratingRepository.save(any(Rating.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = adminPostService.deleteAdminPosts(List.of(10L, 11L));

        assertNotNull(firstRating.getDeletedAt());
        assertNotNull(secondRating.getDeletedAt());
        verify(ratingRepository, never()).delete(any());
        assertEquals(2, result.deletedCount());
    }

    private User user(Long id, String phoneNumber, String username) {
        User user = User.builder()
            .phoneNumber(phoneNumber)
            .username(username)
            .profilePicUrl("uploads/profile.jpg")
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

    private RateableItem rateableItem(Long id, User author, String body, MediaAsset mediaAsset) {
        RateableItem item = RateableItem.builder()
            .createdByUser(author)
            .itemType(mediaAsset == null ? RateableItemType.TEXT_POST : RateableItemType.PHOTO)
            .body(body)
            .mediaAsset(mediaAsset)
            .visibility(Visibility.PUBLIC)
            .build();
        ReflectionTestUtils.setField(item, "id", id);
        ReflectionTestUtils.setField(item, "createdAt", Instant.parse("2026-01-01T00:00:00Z"));
        return item;
    }

    private Rating rating(Long id, User author, RateableItem item, RatingScale scale, BigDecimal score, String reviewText, Visibility visibility) {
        Rating rating = Rating.builder()
            .authorUser(author)
            .rateableItem(item)
            .ratingScale(scale)
            .score(score)
            .reviewText(reviewText)
            .visibility(visibility)
            .build();
        ReflectionTestUtils.setField(rating, "id", id);
        ReflectionTestUtils.setField(rating, "createdAt", Instant.parse("2026-01-01T00:00:00Z"));
        return rating;
    }

    private MediaAsset mediaAsset(Long id, User author) {
        MediaAsset asset = MediaAsset.builder()
            .ownerUser(author)
            .bucket("images")
            .objectKey("posts/photo.jpg")
            .contentType("image/jpeg")
            .build();
        ReflectionTestUtils.setField(asset, "id", id);
        return asset;
    }
}
