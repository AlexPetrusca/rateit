package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.TopicDto;
import com.rateit.backend.entity.dto.FeedItemDto;
import com.rateit.backend.entity.rest.CreateRerateRequest;
import com.rateit.backend.service.FeedActionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import com.rateit.backend.service.FeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/topics")
@RequiredArgsConstructor
public class TopicController {

    private final FeedService feedService;
    private final FeedActionService feedActionService;

    @GetMapping("/{rateableItemId}")
    public ResponseEntity<TopicDto> getTopic(
        @PathVariable Long rateableItemId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(feedService.getTopic(rateableItemId, token.getToken().getSubject()));
    }

    @PostMapping("/{rateableItemId}/ratings")
    public ResponseEntity<FeedItemDto> rateTopic(
        @PathVariable Long rateableItemId,
        @RequestBody @Valid CreateRerateRequest request,
        JwtAuthenticationToken token
    ) {
        FeedItemDto rating = feedActionService.rateTopic(rateableItemId, request, token.getToken().getSubject());
        return ResponseEntity.status(HttpStatus.CREATED).body(rating);
    }
}
