package com.rateit.backend.controller;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.AdminStatusDto;
import com.rateit.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;

    @GetMapping("/status")
    public ResponseEntity<AdminStatusDto> getStatus(JwtAuthenticationToken token) {
        User user = userService.findByPhoneNumber(token.getToken().getSubject());
        return ResponseEntity.ok(AdminStatusDto.fromUser(user));
    }
}
