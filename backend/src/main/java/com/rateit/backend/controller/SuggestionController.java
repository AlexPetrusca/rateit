package com.rateit.backend.controller;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.SuggestionDto;
import com.rateit.backend.entity.rest.CreateSuggestionRequest;
import com.rateit.backend.service.SuggestionService;
import com.rateit.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/suggestions")
@RequiredArgsConstructor
public class SuggestionController {

    private final SuggestionService suggestionService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<SuggestionDto>> list(
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(suggestionService.list(pageable));
    }

    @PostMapping
    public ResponseEntity<SuggestionDto> create(
        JwtAuthenticationToken token,
        @RequestBody @Valid CreateSuggestionRequest request
    ) {
        User user = userService.findByPhoneNumber(token.getToken().getSubject());
        return ResponseEntity.ok(suggestionService.createSuggestion(user, request));
    }
}
