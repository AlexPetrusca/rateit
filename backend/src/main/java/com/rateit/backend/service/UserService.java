package com.rateit.backend.service;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.types.UserRoles;
import com.rateit.backend.entity.dto.AdminDeleteUsersResultDto;
import com.rateit.backend.entity.rest.UpdateAdminUserRequest;
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
import com.rateit.backend.repository.UserRepository;
import com.rateit.backend.repository.UserExternalAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

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
        User user = User.builder()
            .phoneNumber(phoneNumber)
            .username(username)
            .profilePicUrl(profilePicUrl)
            .role(role == null || role.isBlank() ? UserRoles.USER : role)
            .build();
        return userRepository.save(user);
    }

    public User findById(long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> ResourceNotFoundException.user(userId));
    }

    public User findByPhoneNumber(String phoneNumber) {
        return findByPhoneNumberIncludingDeleted(phoneNumber)
            .filter(user -> user.getDeletedAt() == null)
            .orElseThrow(() -> ResourceNotFoundException.user(phoneNumber));
    }

    public Optional<User> findByPhoneNumberIncludingDeleted(String phoneNumber) {
        return userRepository.findByPhoneNumber(phoneNumber);
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
}
