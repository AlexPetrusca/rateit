package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.UserSearchResultDto;
import com.rateit.backend.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/follows")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    @PostMapping("/{userId:\\d+}")
    public ResponseEntity<UserSearchResultDto> follow(
        @PathVariable long userId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(followService.follow(userId, token.getToken().getSubject()));
    }

    @DeleteMapping("/{userId:\\d+}")
    public ResponseEntity<UserSearchResultDto> unfollow(
        @PathVariable long userId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(followService.unfollow(userId, token.getToken().getSubject()));
    }
}
