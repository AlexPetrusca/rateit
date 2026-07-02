package com.rateit.backend.service;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.Follow;
import com.rateit.backend.entity.TourneyPlayerRating;
import com.rateit.backend.entity.types.UserRoles;
import com.rateit.backend.entity.dto.AdminDeleteUsersResultDto;
import com.rateit.backend.entity.dto.UserProfileDto;
import com.rateit.backend.entity.dto.UserSearchResultDto;
import com.rateit.backend.entity.rest.UpdateAdminUserRequest;
import com.rateit.backend.entity.types.FollowRelation;
import com.rateit.backend.exception.BadRequestException;
import com.rateit.backend.exception.ConflictException;
import com.rateit.backend.exception.ResourceNotFoundException;
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
import com.rateit.backend.repository.TourneyPlayerRatingRepository;
import com.rateit.backend.repository.UserRepository;
import com.rateit.backend.repository.UserExternalAccountRepository;
import com.rateit.backend.service.TourneyEloService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final RatingRepository ratingRepository;
    private final RatingCommentRepository ratingCommentRepository;
    private final RatingLikeRepository ratingLikeRepository;
    private final RateableItemRepository rateableItemRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final FeedEventRepository feedEventRepository;
    private final RatingScaleRepository ratingScaleRepository;
    private final UserExternalAccountRepository userExternalAccountRepository;
    private final FollowRepository followRepository;
    private final FriendshipRepository friendshipRepository;
    private final ExternalReviewRepository externalReviewRepository;
    private final TourneyPlayerRatingRepository tourneyPlayerRatingRepository;
    private final AdminPostService adminPostService;

    public List<User> getAll() {
        return userRepository.findAll();
    }

    public Page<User> list(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    public User create(User user) {
        if (user.getRole() == null) {
            user = User.builder()
                .phoneNumber(user.getPhoneNumber())
                .firstName(user.getUsername())
                .lastName(user.getUsername())
                .username(user.getUsername())
                .profilePicUrl(user.getProfilePicUrl())
                .role(UserRoles.USER)
                .build();
        }
        return userRepository.save(user);
    }

    public User create(String phoneNumber, String username, String profilePicUrl) {
        return create(phoneNumber, username, profilePicUrl, UserRoles.USER);
    }

    public User create(String phoneNumber, String username, String profilePicUrl, String role) {
        String normalizedPhoneNumber = normalizeRequired(phoneNumber, "phone number");
        String normalizedUsername = normalizeRequired(username, "username");
        String normalizedProfilePicUrl = normalizeOptional(profilePicUrl);

        userRepository.findByPhoneNumber(normalizedPhoneNumber)
            .ifPresent(existing -> {
                throw ConflictException.conflict("Phone number " + normalizedPhoneNumber + " is already in use");
            });

        userRepository.findByUsername(normalizedUsername)
            .ifPresent(existing -> {
                throw ConflictException.conflict("Username " + normalizedUsername + " is already in use");
            });

        User user = User.builder()
            .phoneNumber(normalizedPhoneNumber)
            .firstName(normalizedUsername)
            .lastName(normalizedUsername)
            .username(normalizedUsername)
            .profilePicUrl(normalizedProfilePicUrl)
            .role(role == null || role.isBlank() ? UserRoles.USER : role)
            .build();
        return userRepository.save(user);
    }

    @Transactional
    public User updateCurrentUser(String phoneNumber, String username, String profilePicUrl) {
        User user = findByPhoneNumber(phoneNumber);
        String normalizedUsername = normalizeRequired(username, "username");
        String normalizedProfilePicUrl = normalizeOptional(profilePicUrl);

        userRepository.findByUsername(normalizedUsername)
            .filter(existing -> !existing.getId().equals(user.getId()))
            .ifPresent(existing -> {
                throw ConflictException.conflict("Username " + normalizedUsername + " is already in use");
            });

        user.setFirstName(normalizedUsername);
        user.setLastName(normalizedUsername);
        user.setUsername(normalizedUsername);
        user.setProfilePicUrl(normalizedProfilePicUrl);

        return userRepository.save(user);
    }

    public User findById(long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> ResourceNotFoundException.user(userId));
    }

    public UserProfileDto getProfile(long userId, String currentPhoneNumber) {
        User user = findById(userId);
        if (user.getDeletedAt() != null) {
            throw ResourceNotFoundException.user(userId);
        }

        User currentUser = findByPhoneNumber(currentPhoneNumber);
        return UserProfileDto.fromUser(
            user,
            getFollowRelation(currentUser, user),
            followRepository.countByFollowedUser(user),
            followRepository.countByFollowerUser(user),
            getTourneyElo(user)
        );
    }

    public List<UserSearchResultDto> searchUsers(String query, int limit, String currentPhoneNumber) {
        String normalizedQuery = normalizeOptional(query);
        if (normalizedQuery == null) {
            return List.of();
        }

        User currentUser = findByPhoneNumber(currentPhoneNumber);
        int normalizedLimit = Math.max(1, Math.min(limit, 20));

        List<User> matches;
        try {
            // Ranked, typo-tolerant match (exact > prefix > substring > fuzzy).
            matches = userRepository.searchVisibleUsersByUsernameFuzzy(
                normalizedQuery, escapeLike(normalizedQuery), SEARCH_SIMILARITY_THRESHOLD, normalizedLimit);
        } catch (Exception e) {
            // pg_trgm not available — fall back to plain substring matching.
            log.warn("Fuzzy username search unavailable, falling back to substring: {}", e.getMessage());
            matches = userRepository.searchVisibleUsersByUsername(normalizedQuery, PageRequest.of(0, normalizedLimit));
        }

        return matches.stream()
            .map(user -> UserSearchResultDto.fromUser(user, getFollowRelation(currentUser, user)))
            .toList();
    }

    private static final double SEARCH_SIMILARITY_THRESHOLD = 0.3;

    // Escape LIKE metacharacters so a query like "50%" matches literally rather
    // than as a wildcard (paired with `escape '\'` in the query).
    private String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    public List<UserSearchResultDto> listFollowers(long userId, String currentPhoneNumber) {
        User user = findVisibleUser(userId);
        User currentUser = findByPhoneNumber(currentPhoneNumber);

        return followRepository.findFollowers(user).stream()
            .map(Follow::getFollowerUser)
            .filter(follower -> follower.getDeletedAt() == null)
            .map(follower -> UserSearchResultDto.fromUser(follower, getFollowRelation(currentUser, follower)))
            .toList();
    }

    public List<UserSearchResultDto> listFollowing(long userId, String currentPhoneNumber) {
        User user = findVisibleUser(userId);
        User currentUser = findByPhoneNumber(currentPhoneNumber);

        return followRepository.findFollowing(user).stream()
            .map(Follow::getFollowedUser)
            .filter(followed -> followed.getDeletedAt() == null)
            .map(followed -> UserSearchResultDto.fromUser(followed, getFollowRelation(currentUser, followed)))
            .toList();
    }

    private FollowRelation getFollowRelation(User currentUser, User profileUser) {
        if (currentUser.getId().equals(profileUser.getId())) {
            return FollowRelation.SELF;
        }

        return followRepository.existsByFollowerUserAndFollowedUser(currentUser, profileUser)
            ? FollowRelation.FOLLOWING
            : FollowRelation.NOT_FOLLOWING;
    }

    private User findVisibleUser(long userId) {
        User user = findById(userId);
        if (user.getDeletedAt() != null) {
            throw ResourceNotFoundException.user(userId);
        }

        return user;
    }

    public User findByPhoneNumber(String phoneNumber) {
        return findByPhoneNumberIncludingDeleted(phoneNumber)
            .filter(user -> user.getDeletedAt() == null)
            .orElseThrow(() -> ResourceNotFoundException.user(phoneNumber));
    }

    private BigDecimal getTourneyElo(User user) {
        return tourneyPlayerRatingRepository.findAllByCriticUserIdAndRatingSystemOrderByLastRatedAtDescRatingDescIdAsc(
                user.getId(),
                TourneyEloService.RATING_SYSTEM
            ).stream()
            .findFirst()
            .map(TourneyPlayerRating::getRating)
            .orElse(null);
    }

    public Optional<User> findByPhoneNumberIncludingDeleted(String phoneNumber) {
        String normalizedPhoneNumber = normalizeLookupPhoneNumber(phoneNumber);
        Optional<User> exactMatch = userRepository.findByPhoneNumber(normalizedPhoneNumber);
        if (exactMatch.isPresent()) {
            return exactMatch;
        }

        String normalizedDigits = digitsOnly(normalizedPhoneNumber);
        if (normalizedDigits == null || normalizedDigits.isBlank()) {
            return Optional.empty();
        }

        return userRepository.findAll().stream()
            .filter(user -> normalizedDigits.equals(digitsOnly(user.getPhoneNumber())))
            .findFirst();
    }

    public List<User> findAllTestUsers() {
        return userRepository.findAllByRole(UserRoles.TEST_USER).stream()
            .filter(user -> user.getDeletedAt() == null)
            .toList();
    }

    @Transactional
    public User updateAdminUser(long userId, UpdateAdminUserRequest request, String currentPhoneNumber) {
        User user = findById(userId);

        if (user.getDeletedAt() != null) {
            throw BadRequestException.invalidRequest("Deleted users cannot be edited");
        }

        String phoneNumber = normalizeRequired(request.phoneNumber(), "phone number");
        String username = normalizeRequired(request.username(), "username");
        String role = normalizeRequired(request.role(), "role");
        String profilePicUrl = normalizeOptional(request.profilePicUrl());

        if (user.getPhoneNumber().equals(currentPhoneNumber) && !user.getPhoneNumber().equals(phoneNumber)) {
            throw BadRequestException.invalidRequest("You cannot change your own phone number from the admin page");
        }

        userRepository.findByPhoneNumber(phoneNumber)
            .filter(existing -> !existing.getId().equals(userId))
            .ifPresent(existing -> {
                throw ConflictException.conflict("User phone number " + phoneNumber + " is already in use");
            });

        userRepository.findByUsername(username)
            .filter(existing -> !existing.getId().equals(userId))
            .ifPresent(existing -> {
                throw ConflictException.conflict("Username " + username + " is already in use");
            });

        user.setPhoneNumber(phoneNumber);
        user.setFirstName(username);
        user.setLastName(username);
        user.setUsername(username);
        user.setProfilePicUrl(profilePicUrl);
        user.setRole(role);

        return userRepository.save(user);
    }

    @Transactional
    public void deleteAdminUser(long userId, String currentPhoneNumber) {
        User user = findById(userId);

        if (user.getPhoneNumber().equals(currentPhoneNumber)) {
            throw BadRequestException.invalidRequest("You cannot delete your own admin account");
        }

        deleteUserContent(user);
        userRepository.delete(user);
    }

    @Transactional
    public AdminDeleteUsersResultDto deleteAdminUsers(List<Long> userIds, String currentPhoneNumber) {
        int deletedCount = 0;

        for (Long userId : userIds) {
            deleteAdminUser(userId, currentPhoneNumber);
            deletedCount++;
        }

        return new AdminDeleteUsersResultDto(deletedCount);
    }

    @Transactional
    public AdminDeleteUsersResultDto deleteAllTestUsers() {
        List<User> testUsers = userRepository.findAllByRole(UserRoles.TEST_USER);
        int deletedCount = 0;

        for (User user : testUsers) {
            deleteUserContent(user);
            userRepository.delete(user);
            deletedCount++;
        }

        return new AdminDeleteUsersResultDto(deletedCount);
    }

    private void deleteUserContent(User user) {
        ratingRepository.findByAuthorUser(user).forEach(rating -> adminPostService.deleteAdminPost(rating.getId()));
        ratingCommentRepository.deleteByAuthorUser(user);
        ratingLikeRepository.deleteByUser(user);
        feedEventRepository.deleteByActorUser(user);
        externalReviewRepository.deleteByUserExternalAccount_User(user);
        userExternalAccountRepository.deleteByUser(user);
        followRepository.deleteByFollowerUserOrFollowedUser(user, user);
        friendshipRepository.deleteByRequesterUserOrAddresseeUser(user, user);
        ratingScaleRepository.deleteByOwnerUser(user);
        rateableItemRepository.deleteByCreatedByUser(user);
        mediaAssetRepository.deleteByOwnerUser(user);
    }

    private String normalizeRequired(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw BadRequestException.invalidRequest("Missing required " + fieldName);
        }

        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private String normalizeLookupPhoneNumber(String phoneNumber) {
        if (phoneNumber == null) {
            return null;
        }

        return phoneNumber.trim();
    }

    private String digitsOnly(String phoneNumber) {
        if (phoneNumber == null) {
            return null;
        }

        return phoneNumber.replaceAll("\\D", "");
    }
}
