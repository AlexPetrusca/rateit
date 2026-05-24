package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.FeedItemDto;
import com.rateit.backend.service.FeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
public class FeedController {

    private final FeedService feedService;

    @GetMapping
    public ResponseEntity<List<FeedItemDto>> getFeed(@RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(feedService.getRecentRatings(limit));
    }
}
