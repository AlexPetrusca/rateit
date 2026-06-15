package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.TopicDto;
import com.rateit.backend.service.FeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/topics")
@RequiredArgsConstructor
public class TopicController {

    private final FeedService feedService;

    @GetMapping("/{rateableItemId}")
    public ResponseEntity<TopicDto> getTopic(
        @PathVariable Long rateableItemId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(feedService.getTopic(rateableItemId, token.getToken().getSubject()));
    }
}
