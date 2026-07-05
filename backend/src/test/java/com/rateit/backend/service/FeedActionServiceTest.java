package com.rateit.backend.service;

import com.rateit.backend.entity.MediaAsset;
import com.rateit.backend.entity.RateableItem;
import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.RatingComment;
import com.rateit.backend.entity.RatingScale;
import com.rateit.backend.entity.RatingLike;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.FeedItemDto;
import com.rateit.backend.entity.rest.CreateRatingRequest;
import com.rateit.backend.entity.rest.CreateRerateRequest;
import com.rateit.backend.entity.types.RateableItemType;
import com.rateit.backend.entity.types.RatingScaleType;
import com.rateit.backend.entity.types.Visibility;
import com.rateit.backend.exception.AuthorizationException;
import com.rateit.backend.exception.BadRequestException;
import com.rateit.backend.repository.MediaAssetRepository;
import com.rateit.backend.repository.ExternalReviewRepository;
import com.rateit.backend.repository.FeedEventRepository;
import com.rateit.backend.repository.RateableItemRepository;
import com.rateit.backend.repository.RatingCommentRepository;
import com.rateit.backend.repository.RatingCommentLikeRepository;
import com.rateit.backend.repository.RatingLikeRepository;
import com.rateit.backend.repository.RatingRepository;
import com.rateit.backend.repository.RatingScaleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedActionServiceTest {

    @Mock
    private RatingRepository ratingRepository;

    @Mock
    private RatingLikeRepository ratingLikeRepository;

    @Mock
    private RatingCommentRepository ratingCommentRepository;

    @Mock
    private RatingCommentLikeRepository ratingCommentLikeRepository;

    @Mock
    private RatingScaleRepository ratingScaleRepository;

    @Mock
    private RateableItemRepository rateableItemRepository;

    @Mock
    private MediaAssetRepository mediaAssetRepository;

    @Mock
    private FeedEventRepository feedEventRepository;

    @Mock
    private ExternalReviewRepository externalReviewRepository;

    @Mock
    private UserService userService;

    private FeedActionService feedActionService;

    @BeforeEach
    void setUp() {
        feedActionService = new FeedActionService(
            ratingRepository,
            ratingLikeRepository,
            ratingCommentRepository,
            ratingCommentLikeRepository,
            ratingScaleRepository,
            rateableItemRepository,
            mediaAssetRepository,
            feedEventRepository,
            externalReviewRepository,
            userService
        );
    }

    @Test
    void createRating_createsTextPostWithDefaultScale() {
        User author = user(1L, "5551234567", "bob_bananas");
        RatingScale defaultScale = ratingScale(2L, "5 stars", new BigDecimal("1"), new BigDecimal("5"), new BigDecimal("0.5"));

        when(userService.findByPhoneNumber(author.getPhoneNumber())).thenReturn(author);
        when(ratingScaleRepository.findDefaultScale()).thenReturn(Optional.of(defaultScale));
        when(rateableItemRepository.save(any(RateableItem.class))).thenAnswer(invocation -> {
            RateableItem item = invocation.getArgument(0);
            ReflectionTestUtils.setField(item, "id", 11L);
            return item;
        });
        when(ratingRepository.save(any(Rating.class))).thenAnswer(invocation -> {
            Rating rating = invocation.getArgument(0);
            ReflectionTestUtils.setField(rating, "id", 21L);
            return rating;
        });

        FeedItemDto result = feedActionService.createRating(
            new CreateRatingRequest("  A small post  ", "  Nice.  ", new BigDecimal("4.5"), null, null),
            author.getPhoneNumber()
        );

        ArgumentCaptor<RateableItem> itemCaptor = ArgumentCaptor.forClass(RateableItem.class);
        ArgumentCaptor<Rating> ratingCaptor = ArgumentCaptor.forClass(Rating.class);

        verify(rateableItemRepository).save(itemCaptor.capture());
        verify(ratingRepository).save(ratingCaptor.capture());

        RateableItem persistedItem = itemCaptor.getValue();
        Rating persistedRating = ratingCaptor.getValue();

        assertEquals(RateableItemType.TEXT_POST, persistedItem.getItemType());
        assertNull(persistedItem.getTitle());
        assertEquals("A small post", persistedItem.getBody());
        assertNull(persistedItem.getMediaAsset());
        assertEquals(Visibility.PUBLIC, persistedItem.getVisibility());
        assertSame(author, persistedItem.getCreatedByUser());

        assertSame(persistedItem, persistedRating.getRateableItem());
        assertSame(defaultScale, persistedRating.getRatingScale());
        assertEquals(new BigDecimal("4.5"), persistedRating.getScore());
        assertEquals("Nice.", persistedRating.getReviewText());
        assertEquals(Visibility.PUBLIC, persistedRating.getVisibility());

        assertEquals(21L, result.ratingId());
        assertEquals("bob_bananas", result.author().username());
        assertEquals(RateableItemType.TEXT_POST, result.rateableItem().type());
        assertEquals("A small post", result.rateableItem().body());
        assertNull(result.rateableItem().mediaObjectKey());
        assertEquals("5 stars", result.ratingScale().name());
        assertEquals(new BigDecimal("4.5"), result.score());
        assertEquals("Nice.", result.reviewText());
    }

    @Test
    void createRating_createsPhotoPostWithMediaAsset() {
        User author = user(1L, "5551234567", "bob_bananas");
        RatingScale defaultScale = ratingScale(2L, "5 stars", new BigDecimal("1"), new BigDecimal("5"), new BigDecimal("0.5"));

        when(userService.findByPhoneNumber(author.getPhoneNumber())).thenReturn(author);
        when(ratingScaleRepository.findDefaultScale()).thenReturn(Optional.of(defaultScale));
        when(mediaAssetRepository.save(any(MediaAsset.class))).thenAnswer(invocation -> {
            MediaAsset asset = invocation.getArgument(0);
            ReflectionTestUtils.setField(asset, "id", 3L);
            return asset;
        });
        when(rateableItemRepository.save(any(RateableItem.class))).thenAnswer(invocation -> {
            RateableItem item = invocation.getArgument(0);
            ReflectionTestUtils.setField(item, "id", 11L);
            return item;
        });
        when(ratingRepository.save(any(Rating.class))).thenAnswer(invocation -> {
            Rating rating = invocation.getArgument(0);
            ReflectionTestUtils.setField(rating, "id", 21L);
            return rating;
        });

        FeedItemDto result = feedActionService.createRating(
            new CreateRatingRequest(null, "Great shot", new BigDecimal("5"), "uploads/photo.jpg", "image/jpeg"),
            author.getPhoneNumber()
        );

        ArgumentCaptor<MediaAsset> assetCaptor = ArgumentCaptor.forClass(MediaAsset.class);
        ArgumentCaptor<RateableItem> itemCaptor = ArgumentCaptor.forClass(RateableItem.class);

        verify(mediaAssetRepository).save(assetCaptor.capture());
        verify(rateableItemRepository).save(itemCaptor.capture());

        MediaAsset persistedAsset = assetCaptor.getValue();
        RateableItem persistedItem = itemCaptor.getValue();

        assertSame(author, persistedAsset.getOwnerUser());
        assertEquals("images", persistedAsset.getBucket());
        assertEquals("uploads/photo.jpg", persistedAsset.getObjectKey());
        assertEquals("image/jpeg", persistedAsset.getContentType());

        assertEquals(RateableItemType.PHOTO, persistedItem.getItemType());
        assertSame(persistedAsset, persistedItem.getMediaAsset());
        assertNull(persistedItem.getTitle());
        assertNull(persistedItem.getBody());

        assertEquals(21L, result.ratingId());
        assertEquals(RateableItemType.PHOTO, result.rateableItem().type());
        assertEquals("uploads/photo.jpg", result.rateableItem().mediaObjectKey());
        assertEquals("Great shot", result.reviewText());
    }

    @Test
    void createRating_createsDefaultScaleWhenDatabaseIsEmpty() {
        User author = user(1L, "5551234567", "bob_bananas");
        RateableItem savedItem = rateableItem(11L, author, RateableItemType.TEXT_POST, "A small post", null);

        when(userService.findByPhoneNumber(author.getPhoneNumber())).thenReturn(author);
        when(ratingScaleRepository.findDefaultScale()).thenReturn(Optional.empty());
        when(ratingScaleRepository.findAll()).thenReturn(List.of());
        when(ratingScaleRepository.save(any(RatingScale.class))).thenAnswer(invocation -> {
            RatingScale scale = invocation.getArgument(0);
            ReflectionTestUtils.setField(scale, "id", 2L);
            return scale;
        });
        when(rateableItemRepository.save(any(RateableItem.class))).thenReturn(savedItem);
        when(ratingRepository.save(any(Rating.class))).thenAnswer(invocation -> {
            Rating rating = invocation.getArgument(0);
            ReflectionTestUtils.setField(rating, "id", 21L);
            return rating;
        });

        FeedItemDto result = feedActionService.createRating(
            new CreateRatingRequest("A small post", "Nice.", new BigDecimal("4"), null, null),
            author.getPhoneNumber()
        );

        verify(ratingScaleRepository).save(any(RatingScale.class));
        assertEquals(21L, result.ratingId());
        assertEquals("5 stars", result.ratingScale().name());
    }

    @Test
    void createRating_rejectsEmptyTextAndNoImage() {
        User author = user(1L, "5551234567", "bob_bananas");
        RatingScale defaultScale = ratingScale(2L, "5 stars", new BigDecimal("1"), new BigDecimal("5"), new BigDecimal("0.5"));

        when(userService.findByPhoneNumber(author.getPhoneNumber())).thenReturn(author);
        when(ratingScaleRepository.findDefaultScale()).thenReturn(Optional.of(defaultScale));

        BadRequestException ex = assertThrows(
            BadRequestException.class,
            () -> feedActionService.createRating(
                new CreateRatingRequest("   ", "Review", new BigDecimal("4"), null, null),
                author.getPhoneNumber()
            )
        );

        assertEquals("Text posts need body text or an image", ex.getMessage());
        verify(rateableItemRepository, never()).save(any());
        verify(ratingRepository, never()).save(any());
    }

    @Test
    void rerate_alwaysCreatesNewRatingForSameRateableItem() {
        User sourceAuthor = user(1L, "5551234567", "bob_bananas");
        User currentUser = user(2L, "5559876543", "alice_apples");
        RatingScale scale = ratingScale(2L, "5 stars", new BigDecimal("1"), new BigDecimal("5"), new BigDecimal("0.5"));
        RateableItem item = rateableItem(11L, sourceAuthor, RateableItemType.TEXT_POST, "Original post", null);
        Rating sourceRating = rating(21L, sourceAuthor, item, scale, new BigDecimal("3"), "Original take");

        when(ratingRepository.findById(sourceRating.getId())).thenReturn(Optional.of(sourceRating));
        when(userService.findByPhoneNumber(currentUser.getPhoneNumber())).thenReturn(currentUser);
        when(ratingRepository.save(any(Rating.class))).thenAnswer(invocation -> {
            Rating rating = invocation.getArgument(0);
            ReflectionTestUtils.setField(rating, "id", 31L);
            return rating;
        });

        FeedItemDto result = feedActionService.rerate(
            sourceRating.getId(),
            new CreateRerateRequest(new BigDecimal("4.5"), "  New take  "),
            currentUser.getPhoneNumber()
        );

        ArgumentCaptor<Rating> ratingCaptor = ArgumentCaptor.forClass(Rating.class);
        verify(ratingRepository).save(ratingCaptor.capture());

        Rating persistedRating = ratingCaptor.getValue();
        assertSame(currentUser, persistedRating.getAuthorUser());
        assertSame(item, persistedRating.getRateableItem());
        assertSame(scale, persistedRating.getRatingScale());
        assertEquals(new BigDecimal("4.5"), persistedRating.getScore());
        assertEquals("New take", persistedRating.getReviewText());
        assertEquals(Visibility.PUBLIC, persistedRating.getVisibility());
        assertEquals(31L, result.ratingId());
        assertEquals("alice_apples", result.author().username());
    }

    @Test
    void updateRating_changesOwnPostAndReturnsUpdatedFeedItem() {
        User author = user(1L, "5551234567", "bob_bananas");
        RatingScale scale = ratingScale(2L, "5 stars", new BigDecimal("1"), new BigDecimal("5"), new BigDecimal("0.5"));
        RateableItem item = rateableItem(11L, author, RateableItemType.TEXT_POST, "Old topic", null);
        Rating rating = rating(21L, author, item, scale, new BigDecimal("3"), "Old review");

        when(userService.findByPhoneNumber(author.getPhoneNumber())).thenReturn(author);
        when(ratingRepository.findById(rating.getId())).thenReturn(Optional.of(rating));
        when(ratingLikeRepository.countByRating(rating)).thenReturn(4L);
        when(ratingCommentRepository.countByRating(rating)).thenReturn(2L);
        when(ratingLikeRepository.findByRatingAndUser(rating, author)).thenReturn(Optional.of(RatingLike.builder().build()));
        when(ratingRepository.save(any(Rating.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(rateableItemRepository.save(any(RateableItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FeedItemDto result = feedActionService.updateRating(
            rating.getId(),
            new com.rateit.backend.entity.rest.UpdateRatingRequest("New topic", "New review", new BigDecimal("4.5")),
            author.getPhoneNumber()
        );

        assertEquals("New topic", item.getBody());
        assertEquals("New review", rating.getReviewText());
        assertEquals(new BigDecimal("4.5"), rating.getScore());
        assertEquals(4L, result.likeCount());
        assertEquals(2L, result.commentCount());
        assertTrue(result.likedByCurrentUser());
    }

    @Test
    void deleteRating_softDeletesOwnPost() {
        User author = user(1L, "5551234567", "bob_bananas");
        RatingScale scale = ratingScale(2L, "5 stars", new BigDecimal("1"), new BigDecimal("5"), new BigDecimal("0.5"));
        RateableItem item = rateableItem(11L, author, RateableItemType.TEXT_POST, "Old topic", null);
        Rating rating = rating(21L, author, item, scale, new BigDecimal("3"), "Old review");

        when(userService.findByPhoneNumber(author.getPhoneNumber())).thenReturn(author);
        when(ratingRepository.findById(rating.getId())).thenReturn(Optional.of(rating));
        when(ratingCommentRepository.countByRating(rating)).thenReturn(1L);

        feedActionService.deleteRating(rating.getId(), author.getPhoneNumber());

        assertNotNull(rating.getDeletedAt());
        verify(feedEventRepository).deleteByRatingOrRateableItem(rating, item);
        verify(externalReviewRepository).deleteByRatingOrRateableItem(rating, item);
        verify(ratingLikeRepository).deleteByRating(rating);
    }

    @Test
    void deleteComment_removesOwnComment() {
        User author = user(1L, "5551234567", "bob_bananas");
        RatingScale scale = ratingScale(2L, "5 stars", new BigDecimal("1"), new BigDecimal("5"), new BigDecimal("0.5"));
        RateableItem item = rateableItem(11L, author, RateableItemType.TEXT_POST, "Topic", null);
        Rating rating = rating(21L, author, item, scale, new BigDecimal("3"), "review");
        RatingComment comment = RatingComment.builder().rating(rating).authorUser(author).text("hi").score(new BigDecimal("3")).build();
        ReflectionTestUtils.setField(comment, "id", 41L);

        when(ratingCommentRepository.findById(41L)).thenReturn(Optional.of(comment));
        when(userService.findByPhoneNumber(author.getPhoneNumber())).thenReturn(author);
        when(ratingCommentRepository.findByParentCommentOrderByCreatedAtAsc(comment)).thenReturn(List.of());

        feedActionService.deleteComment(41L, author.getPhoneNumber());

        verify(ratingCommentRepository).delete(comment);
    }

    @Test
    void deleteComment_rejectsNonAuthor() {
        User author = user(1L, "5551234567", "bob_bananas");
        User other = user(2L, "5559998888", "eve_edits");
        RatingScale scale = ratingScale(2L, "5 stars", new BigDecimal("1"), new BigDecimal("5"), new BigDecimal("0.5"));
        RateableItem item = rateableItem(11L, author, RateableItemType.TEXT_POST, "Topic", null);
        Rating rating = rating(21L, author, item, scale, new BigDecimal("3"), "review");
        RatingComment comment = RatingComment.builder().rating(rating).authorUser(author).text("hi").score(new BigDecimal("3")).build();
        ReflectionTestUtils.setField(comment, "id", 41L);

        when(ratingCommentRepository.findById(41L)).thenReturn(Optional.of(comment));
        when(userService.findByPhoneNumber(other.getPhoneNumber())).thenReturn(other);

        assertThrows(AuthorizationException.class, () -> feedActionService.deleteComment(41L, other.getPhoneNumber()));
        verify(ratingCommentRepository, never()).delete(any());
    }

    private User user(Long id, String phoneNumber, String username) {
        User user = User.builder()
            .phoneNumber(phoneNumber)
            .username(username)
            .profilePicUrl("uploads/profile.jpg")
            .build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private RatingScale ratingScale(
        Long id,
        String name,
        BigDecimal min,
        BigDecimal max,
        BigDecimal step
    ) {
        RatingScale scale = RatingScale.builder()
            .name(name)
            .scaleType(RatingScaleType.STARS)
            .minValue(min)
            .maxValue(max)
            .step(step)
            .symbol("star")
            .isDefault(true)
            .build();
        ReflectionTestUtils.setField(scale, "id", id);
        return scale;
    }

    private MediaAsset mediaAsset(Long id, User owner, String bucket, String objectKey, String contentType) {
        MediaAsset asset = MediaAsset.builder()
            .ownerUser(owner)
            .bucket(bucket)
            .objectKey(objectKey)
            .contentType(contentType)
            .build();
        ReflectionTestUtils.setField(asset, "id", id);
        return asset;
    }

    private RateableItem rateableItem(
        Long id,
        User owner,
        RateableItemType type,
        String body,
        MediaAsset mediaAsset
    ) {
        RateableItem item = RateableItem.builder()
            .createdByUser(owner)
            .itemType(type)
            .body(body)
            .mediaAsset(mediaAsset)
            .visibility(Visibility.PUBLIC)
            .build();
        ReflectionTestUtils.setField(item, "id", id);
        return item;
    }

    private Rating rating(
        Long id,
        User author,
        RateableItem item,
        RatingScale scale,
        BigDecimal score,
        String reviewText
    ) {
        Rating rating = Rating.builder()
            .authorUser(author)
            .rateableItem(item)
            .ratingScale(scale)
            .score(score)
            .reviewText(reviewText)
            .visibility(Visibility.PUBLIC)
            .build();
        ReflectionTestUtils.setField(rating, "id", id);
        return rating;
    }
}
