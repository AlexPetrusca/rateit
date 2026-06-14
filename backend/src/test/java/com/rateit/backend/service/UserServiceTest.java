package com.rateit.backend.service;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.Rating;
import com.rateit.backend.entity.dto.AdminDeleteUsersResultDto;
import com.rateit.backend.entity.dto.UserProfileDto;
import com.rateit.backend.entity.dto.UserSearchResultDto;
import com.rateit.backend.entity.rest.UpdateAdminUserRequest;
import com.rateit.backend.entity.types.FollowRelation;
import com.rateit.backend.exception.BadRequestException;
import com.rateit.backend.exception.ConflictException;
import com.rateit.backend.repository.ExternalReviewRepository;
import com.rateit.backend.repository.FeedEventRepository;
import com.rateit.backend.repository.FollowRepository;
import com.rateit.backend.repository.FriendshipRepository;
import com.rateit.backend.repository.MediaAssetRepository;
import com.rateit.backend.repository.RateableItemRepository;
import com.rateit.backend.repository.RatingCommentRepository;
import com.rateit.backend.repository.RatingLikeRepository;
import com.rateit.backend.repository.RatingRepository;
import com.rateit.backend.repository.RatingScaleRepository;
import com.rateit.backend.repository.UserRepository;
import com.rateit.backend.repository.UserExternalAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RatingRepository ratingRepository;

    @Mock
    private RatingCommentRepository ratingCommentRepository;

    @Mock
    private RatingLikeRepository ratingLikeRepository;

    @Mock
    private RateableItemRepository rateableItemRepository;

    @Mock
    private MediaAssetRepository mediaAssetRepository;

    @Mock
    private FeedEventRepository feedEventRepository;

    @Mock
    private RatingScaleRepository ratingScaleRepository;

    @Mock
    private UserExternalAccountRepository userExternalAccountRepository;

    @Mock
    private FollowRepository followRepository;

    @Mock
    private FriendshipRepository friendshipRepository;

    @Mock
    private ExternalReviewRepository externalReviewRepository;

    @Mock
    private AdminPostService adminPostService;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(
            userRepository,
            ratingRepository,
            ratingCommentRepository,
            ratingLikeRepository,
            rateableItemRepository,
            mediaAssetRepository,
            feedEventRepository,
            ratingScaleRepository,
            userExternalAccountRepository,
            followRepository,
            friendshipRepository,
            externalReviewRepository,
            adminPostService
        );
    }

    @Test
    void listReturnsPagedUsers() {
        User user = User.builder()
            .phoneNumber("+15550000001")
            .username("alpha")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(user, "id", 1L);

        when(userRepository.findAll(any(PageRequest.class))).thenReturn(new PageImpl<>(List.of(user)));

        var page = userService.list(PageRequest.of(0, 20));

        assertEquals(1, page.getTotalElements());
        assertEquals("alpha", page.getContent().get(0).getUsername());
    }

    @Test
    void createRejectsBlankUsername() {
        BadRequestException error = assertThrows(
            BadRequestException.class,
            () -> userService.create("+15550000001", "   ", null, "ROLE_USER")
        );

        assertTrue(error.getMessage().contains("username"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void createRejectsDuplicateUsername() {
        User existing = User.builder()
            .phoneNumber("+15550000002")
            .username("alpha")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(existing, "id", 2L);

        when(userRepository.findByPhoneNumber("+15550000001")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("alpha")).thenReturn(Optional.of(existing));

        ConflictException error = assertThrows(
            ConflictException.class,
            () -> userService.create("+15550000001", "alpha", null, "ROLE_USER")
        );

        assertTrue(error.getMessage().contains("already in use"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void getProfileReturnsPublicSafeFieldsOnly() {
        User user = User.builder()
            .phoneNumber("+15550000001")
            .username("alpha")
            .profilePicUrl("alpha.png")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(user, "id", 1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByPhoneNumber("+15550000001")).thenReturn(Optional.of(user));

        UserProfileDto profile = userService.getProfile(1L, "+15550000001");

        assertEquals("alpha", profile.username());
        assertEquals("alpha.png", profile.profilePicUrl());
        assertEquals(FollowRelation.SELF, profile.followRelation());
        assertEquals(0, profile.followerCount());
        assertEquals(0, profile.followingCount());
    }

    @Test
    void searchUsersReturnsPublicSafeResultsWithRelationshipState() {
        User currentUser = User.builder()
            .phoneNumber("+15550000001")
            .username("alpha")
            .profilePicUrl("alpha.png")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(currentUser, "id", 1L);
        User resultUser = User.builder()
            .phoneNumber("+15550000002")
            .username("beta")
            .profilePicUrl("beta.png")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(resultUser, "id", 2L);

        when(userRepository.findByPhoneNumber("+15550000001")).thenReturn(Optional.of(currentUser));
        when(userRepository.searchVisibleUsersByUsername(any(String.class), any(PageRequest.class)))
            .thenReturn(List.of(resultUser));
        when(followRepository.existsByFollowerUserAndFollowedUser(currentUser, resultUser)).thenReturn(false);

        List<UserSearchResultDto> results = userService.searchUsers("bet", 10, "+15550000001");

        assertEquals(1, results.size());
        assertEquals(2L, results.get(0).userId());
        assertEquals("beta", results.get(0).username());
        assertEquals("beta.png", results.get(0).profilePicUrl());
        assertEquals(FollowRelation.NOT_FOLLOWING, results.get(0).followRelation());
    }

    @Test
    void updateAdminUserPersistsUpdatedFields() {
        User existing = User.builder()
            .phoneNumber("+15550000001")
            .username("alpha")
            .profilePicUrl("old.png")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(existing, "id", 1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepository.findByPhoneNumber("+15550000002")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("beta")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = userService.updateAdminUser(1L, new UpdateAdminUserRequest(
            "+15550000002",
            "beta",
            "",
            "ROLE_TEST_USER"
        ), "+15550000099");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());

        User saved = userCaptor.getValue();
        assertEquals(1L, saved.getId());
        assertEquals("+15550000002", saved.getPhoneNumber());
        assertEquals("beta", saved.getUsername());
        assertEquals(null, saved.getProfilePicUrl());
        assertEquals("ROLE_TEST_USER", saved.getRole());
        assertEquals("beta", updated.getUsername());
    }

    @Test
    void deleteAdminUserRejectsDeletingCurrentAccount() {
        User existing = User.builder()
            .phoneNumber("+15550000001")
            .username("alpha")
            .role("ROLE_ADMIN")
            .build();
        ReflectionTestUtils.setField(existing, "id", 1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));

        BadRequestException error = assertThrows(
            BadRequestException.class,
            () -> userService.deleteAdminUser(1L, "+15550000001")
        );

        assertTrue(error.getMessage().contains("your own admin account"));
        verify(userRepository, never()).delete(any(User.class));
    }

    @Test
    void deleteAdminUserHardDeletesUsersWithoutContent() {
        User existing = User.builder()
            .phoneNumber("+15550000001")
            .username("alpha")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(existing, "id", 1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(ratingRepository.findByAuthorUser(existing)).thenReturn(List.of());

        userService.deleteAdminUser(1L, "+15550000099");

        verify(userRepository).delete(existing);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void deleteAdminUserHardDeletesUsersWithContent() {
        User existing = User.builder()
            .phoneNumber("+15550000001")
            .username("alpha")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(existing, "id", 1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        Rating rating = Rating.builder().build();
        ReflectionTestUtils.setField(rating, "id", 99L);
        when(ratingRepository.findByAuthorUser(existing)).thenReturn(List.of(rating));

        userService.deleteAdminUser(1L, "+15550000099");

        verify(adminPostService).deleteAdminPost(99L);
        verify(userRepository).delete(existing);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateAdminUserRejectsChangingOwnPhoneNumber() {
        User existing = User.builder()
            .phoneNumber("+15550000001")
            .username("alpha")
            .role("ROLE_ADMIN")
            .build();
        ReflectionTestUtils.setField(existing, "id", 1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));

        BadRequestException error = assertThrows(
            BadRequestException.class,
            () -> userService.updateAdminUser(1L, new UpdateAdminUserRequest(
                "+15550000002",
                "alpha",
                null,
                "ROLE_ADMIN"
            ), "+15550000001")
        );

        assertTrue(error.getMessage().contains("your own phone number"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void deleteAllTestUsersRemovesOnlyTestUsers() {
        User testUserA = User.builder()
            .phoneNumber("+15550000001")
            .username("alpha")
            .role("ROLE_TEST_USER")
            .build();
        ReflectionTestUtils.setField(testUserA, "id", 1L);
        User testUserB = User.builder()
            .phoneNumber("+15550000002")
            .username("beta")
            .role("ROLE_TEST_USER")
            .build();
        ReflectionTestUtils.setField(testUserB, "id", 2L);

        when(userRepository.findAllByRole("ROLE_TEST_USER")).thenReturn(List.of(testUserA, testUserB));
        when(ratingRepository.findByAuthorUser(testUserA)).thenReturn(List.of());
        when(ratingRepository.findByAuthorUser(testUserB)).thenReturn(List.of());

        AdminDeleteUsersResultDto result = userService.deleteAllTestUsers();

        verify(userRepository).delete(testUserA);
        verify(userRepository).delete(testUserB);
        assertEquals(2, result.deletedCount());
    }

    @Test
    void deleteAdminUsersBulkDeletesEachUser() {
        User userA = User.builder()
            .phoneNumber("+15550000001")
            .username("alpha")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(userA, "id", 1L);
        User userB = User.builder()
            .phoneNumber("+15550000002")
            .username("beta")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(userB, "id", 2L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(userA));
        when(userRepository.findById(2L)).thenReturn(Optional.of(userB));
        when(ratingRepository.findByAuthorUser(userA)).thenReturn(List.of());
        when(ratingRepository.findByAuthorUser(userB)).thenReturn(List.of());

        AdminDeleteUsersResultDto result = userService.deleteAdminUsers(List.of(1L, 2L), "+15550000099");

        verify(userRepository).delete(userA);
        verify(userRepository).delete(userB);
        assertEquals(2, result.deletedCount());
    }
}
