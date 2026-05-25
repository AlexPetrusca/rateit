package com.rateit.backend.service;

import com.rateit.backend.entity.User;
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

import java.time.Instant;
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
                .role("ROLE_USER")
                .build();
        }
        return userRepository.save(user);
    }

    public User create(String phoneNumber, String username, String profilePicUrl) {
        return create(phoneNumber, username, profilePicUrl, "ROLE_USER");
    }

    public User create(String phoneNumber, String username, String profilePicUrl, String role) {
        User user = User.builder()
            .phoneNumber(phoneNumber)
            .username(username)
            .profilePicUrl(profilePicUrl)
            .role(role == null || role.isBlank() ? "ROLE_USER" : role)
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

        if (hasOwnedContent(user)) {
            if (user.getDeletedAt() == null) {
                user.setDeletedAt(Instant.now());
                userRepository.save(user);
            }
            return;
        }

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
        List<User> testUsers = userRepository.findAllByRole("ROLE_TEST_USER");
        int deletedCount = 0;

        for (User user : testUsers) {
            if (user.getDeletedAt() == null) {
                if (hasOwnedContent(user)) {
                    user.setDeletedAt(Instant.now());
                    userRepository.save(user);
                } else {
                    userRepository.delete(user);
                }
                deletedCount++;
            } else if (!hasOwnedContent(user)) {
                userRepository.delete(user);
                deletedCount++;
            }
        }

        return new AdminDeleteUsersResultDto(deletedCount);
    }

    public boolean hasOwnedContent(User user) {
        return ratingRepository.countByAuthorUser(user) > 0
            || ratingCommentRepository.countByAuthorUser(user) > 0
            || ratingLikeRepository.countByUser(user) > 0
            || rateableItemRepository.countByCreatedByUser(user) > 0
            || mediaAssetRepository.countByOwnerUser(user) > 0
            || feedEventRepository.countByActorUser(user) > 0
            || ratingScaleRepository.countByOwnerUser(user) > 0
            || userExternalAccountRepository.countByUser(user) > 0
            || followRepository.countByFollowerUserOrFollowedUser(user, user) > 0
            || friendshipRepository.countByRequesterUserOrAddresseeUser(user, user) > 0
            || externalReviewRepository.countByUserExternalAccount_User(user) > 0;
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
