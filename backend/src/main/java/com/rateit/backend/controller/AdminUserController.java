package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.UserDto;
import com.rateit.backend.entity.dto.AdminDeleteUsersResultDto;
import com.rateit.backend.entity.rest.UpdateAdminUserRequest;
import com.rateit.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<UserDto>> listUsers(
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(userService.list(pageable).map(UserDto::fromUser));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<UserDto> updateUser(
        @PathVariable long userId,
        @RequestBody UpdateAdminUserRequest request,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(UserDto.fromUser(userService.updateAdminUser(userId, request, token.getToken().getSubject())));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(
        @PathVariable long userId,
        JwtAuthenticationToken token
    ) {
        userService.deleteAdminUser(userId, token.getToken().getSubject());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/test-users")
    public ResponseEntity<AdminDeleteUsersResultDto> deleteTestUsers() {
        return ResponseEntity.ok(userService.deleteAllTestUsers());
    }
}
