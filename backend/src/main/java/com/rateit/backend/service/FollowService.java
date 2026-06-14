package com.rateit.backend.service;

import com.rateit.backend.entity.Follow;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.UserSearchResultDto;
import com.rateit.backend.entity.types.FollowRelation;
import com.rateit.backend.exception.BadRequestException;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.repository.FollowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserService userService;

    @Transactional
    public UserSearchResultDto follow(long followedUserId, String currentPhoneNumber) {
        User follower = userService.findByPhoneNumber(currentPhoneNumber);
        User followed = findVisibleUser(followedUserId);

        if (follower.getId().equals(followed.getId())) {
            throw BadRequestException.invalidRequest("You cannot follow yourself");
        }

        if (!followRepository.existsByFollowerUserAndFollowedUser(follower, followed)) {
            followRepository.save(Follow.builder()
                .followerUser(follower)
                .followedUser(followed)
                .build());
        }

        return UserSearchResultDto.fromUser(followed, FollowRelation.FOLLOWING);
    }

    @Transactional
    public UserSearchResultDto unfollow(long followedUserId, String currentPhoneNumber) {
        User follower = userService.findByPhoneNumber(currentPhoneNumber);
        User followed = findVisibleUser(followedUserId);

        followRepository.findByFollowerUserAndFollowedUser(follower, followed)
            .ifPresent(followRepository::delete);

        return UserSearchResultDto.fromUser(followed, FollowRelation.NOT_FOLLOWING);
    }

    private User findVisibleUser(long userId) {
        User user = userService.findById(userId);
        if (user.getDeletedAt() != null) {
            throw ResourceNotFoundException.user(userId);
        }

        return user;
    }
}
