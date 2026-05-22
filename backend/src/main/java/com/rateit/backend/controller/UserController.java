package com.rateit.backend.controller;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.UserDto;
import com.rateit.backend.entity.rest.CreateUserRequest;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

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
}
