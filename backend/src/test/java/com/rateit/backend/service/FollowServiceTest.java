package com.rateit.backend.service;

import com.rateit.backend.entity.Follow;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.UserSearchResultDto;
import com.rateit.backend.entity.types.FollowRelation;
import com.rateit.backend.exception.BadRequestException;
import com.rateit.backend.repository.FollowRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FollowServiceTest {

    @Mock
    private FollowRepository followRepository;

    @Mock
    private UserService userService;

    private FollowService followService;

    @BeforeEach
    void setUp() {
        followService = new FollowService(followRepository, userService);
    }

    @Test
    void followCreatesRelationshipWhenMissing() {
        User follower = user(1L, "+15550000001", "alpha");
        User followed = user(2L, "+15550000002", "beta");

        when(userService.findByPhoneNumber("+15550000001")).thenReturn(follower);
        when(userService.findById(2L)).thenReturn(followed);
        when(followRepository.existsByFollowerUserAndFollowedUser(follower, followed)).thenReturn(false);

        UserSearchResultDto result = followService.follow(2L, "+15550000001");

        ArgumentCaptor<Follow> followCaptor = ArgumentCaptor.forClass(Follow.class);
        verify(followRepository).save(followCaptor.capture());
        assertEquals(follower, followCaptor.getValue().getFollowerUser());
        assertEquals(followed, followCaptor.getValue().getFollowedUser());
        assertEquals(FollowRelation.FOLLOWING, result.followRelation());
    }

    @Test
    void followRejectsSelfFollow() {
        User follower = user(1L, "+15550000001", "alpha");

        when(userService.findByPhoneNumber("+15550000001")).thenReturn(follower);
        when(userService.findById(1L)).thenReturn(follower);

        assertThrows(BadRequestException.class, () -> followService.follow(1L, "+15550000001"));
        verify(followRepository, never()).save(any(Follow.class));
    }

    private User user(long id, String phoneNumber, String username) {
        User user = User.builder()
            .phoneNumber(phoneNumber)
            .username(username)
            .profilePicUrl(username + ".png")
            .role("ROLE_USER")
            .build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
