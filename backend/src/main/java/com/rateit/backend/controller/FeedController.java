package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.FeedItemDto;
import com.rateit.backend.entity.dto.RatingCommentDto;
import com.rateit.backend.entity.rest.CreateRatingRequest;
import com.rateit.backend.entity.rest.CreateRatingCommentRequest;
import com.rateit.backend.entity.rest.CreateRerateRequest;
import com.rateit.backend.service.FeedActionService;
import com.rateit.backend.service.FeedService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
public class FeedController {

    private final FeedService feedService;
    private final FeedActionService feedActionService;

    @GetMapping
    public ResponseEntity<List<FeedItemDto>> getFeed(
        @RequestParam(required = false) Integer limit,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(feedService.getRecentRatings(limit, token.getToken().getSubject()));
    }

    @GetMapping("/ratings/{ratingId}")
    public ResponseEntity<FeedItemDto> getRating(
        @PathVariable Long ratingId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(feedService.getRating(ratingId, token.getToken().getSubject()));
    }

    @PostMapping("/ratings")
    public ResponseEntity<FeedItemDto> createRating(
        @RequestBody @Valid CreateRatingRequest request,
        JwtAuthenticationToken token
    ) {
        FeedItemDto created = feedActionService.createRating(request, token.getToken().getSubject());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/ratings/{ratingId}/like")
    public ResponseEntity<Void> likeRating(@PathVariable Long ratingId, JwtAuthenticationToken token) {
        feedActionService.likeRating(ratingId, token.getToken().getSubject());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/ratings/{ratingId}/like")
    public ResponseEntity<Void> unlikeRating(@PathVariable Long ratingId, JwtAuthenticationToken token) {
        feedActionService.unlikeRating(ratingId, token.getToken().getSubject());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/ratings/{ratingId}/comments")
    public ResponseEntity<RatingCommentDto> createComment(
        @PathVariable Long ratingId,
        @RequestBody @Valid CreateRatingCommentRequest request,
        JwtAuthenticationToken token
    ) {
        RatingCommentDto comment = feedActionService.createComment(ratingId, request, token.getToken().getSubject());
        return ResponseEntity.status(HttpStatus.CREATED).body(comment);
    }

    @GetMapping("/ratings/{ratingId}/comments")
    public ResponseEntity<List<RatingCommentDto>> listComments(@PathVariable Long ratingId) {
        return ResponseEntity.ok(feedActionService.listComments(ratingId));
    }

    @PostMapping("/ratings/{ratingId}/rerate")
    public ResponseEntity<FeedItemDto> rerate(
        @PathVariable Long ratingId,
        @RequestBody @Valid CreateRerateRequest request,
        JwtAuthenticationToken token
    ) {
        FeedItemDto rerated = feedActionService.rerate(ratingId, request, token.getToken().getSubject());
        return ResponseEntity.status(HttpStatus.CREATED).body(rerated);
    }
}
