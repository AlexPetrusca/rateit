package com.rateit.backend.controller;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.UserDto;
import com.rateit.backend.entity.rest.CreateUserRequest;
import com.rateit.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        User user = userService.findByPhoneNumber(phoneNumber);
        return ResponseEntity.ok(UserDto.fromUser(user));
    }

    @PostMapping("/me")
    public ResponseEntity<User> createMe(@RequestBody CreateUserRequest req, JwtAuthenticationToken token) {
        String phoneNumber = token.getToken().getSubject();
        User body = userService.create(
            phoneNumber,
            req.firstName(),
            req.lastName(),
            req.profilePicUrl()
        );
        return ResponseEntity.ok(body);
    }
}
