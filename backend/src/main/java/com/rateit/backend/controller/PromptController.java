package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.PromptDto;
import com.rateit.backend.entity.rest.CreatePromptRequest;
import com.rateit.backend.service.FeedActionService;
import com.rateit.backend.service.FeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prompts")
@RequiredArgsConstructor
public class PromptController {

    private final FeedService feedService;
    private final FeedActionService feedActionService;

    @PostMapping
    public ResponseEntity<PromptDto> createPrompt(
        @RequestBody CreatePromptRequest request,
        JwtAuthenticationToken token
    ) {
        PromptDto prompt = feedActionService.createPrompt(request, token.getToken().getSubject());
        return ResponseEntity.status(HttpStatus.CREATED).body(prompt);
    }

    @GetMapping("/users/{userId}/recent")
    public ResponseEntity<List<PromptDto>> getRecentPrompts(
        @PathVariable long userId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(feedService.getRecentPrompts(userId, token.getToken().getSubject()));
    }

    @GetMapping("/me/recent")
    public ResponseEntity<List<PromptDto>> getMyRecentPrompts(JwtAuthenticationToken token) {
        return ResponseEntity.ok(feedService.getMyRecentPrompts(token.getToken().getSubject()));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<PromptDto>> getRecentPrompts(JwtAuthenticationToken token) {
        return ResponseEntity.ok(feedService.getRecentPrompts(token.getToken().getSubject()));
    }
}
