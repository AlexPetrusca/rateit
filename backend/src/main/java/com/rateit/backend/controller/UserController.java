package com.rateit.backend.controller;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.FeedItemDto;
import com.rateit.backend.entity.dto.UserDto;
import com.rateit.backend.entity.dto.UserProfileDto;
import com.rateit.backend.entity.rest.CreateUserRequest;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.service.FeedService;
import com.rateit.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final FeedService feedService;

//    @GetMapping
//    public ResponseEntity<List<User>> getAll() {
//        return ResponseEntity.ok(userService.getAll());
//    }

//    @PostMapping
//    public ResponseEntity<UserDto> createUser(@RequestBody User user) {
//        User newUser = userService.create(user);
//        return ResponseEntity.status(HttpStatus.CREATED).body(UserDto.fromUser(newUser));
//    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe(JwtAuthenticationToken token) {
        String phoneNumber = token.getToken().getSubject();
        try {
            User user = userService.findByPhoneNumber(phoneNumber);
            return ResponseEntity.ok(UserDto.fromUser(user));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.noContent().build();
        }
    }

    @PostMapping("/me")
    public ResponseEntity<User> createMe(@RequestBody CreateUserRequest req, JwtAuthenticationToken token) {
        String phoneNumber = token.getToken().getSubject();
        User body = userService.create(
            phoneNumber,
            req.username(),
            req.profilePicUrl()
        );
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{userId:\\d+}")
    public ResponseEntity<UserProfileDto> getProfile(
        @PathVariable long userId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(userService.getProfile(userId, token.getToken().getSubject()));
    }

    @GetMapping("/{userId:\\d+}/posts")
    public ResponseEntity<Page<FeedItemDto>> getProfilePosts(
        @PathVariable long userId,
        @RequestParam(required = false) Integer page,
        @RequestParam(required = false) Integer size,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(
            feedService.getProfileRatings(userId, size, page, token.getToken().getSubject())
        );
    }
}
