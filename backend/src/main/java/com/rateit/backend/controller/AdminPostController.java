package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.AdminPostDto;
import com.rateit.backend.entity.dto.AdminDeletePostsResultDto;
import com.rateit.backend.entity.rest.BulkDeleteAdminItemsRequest;
import com.rateit.backend.entity.rest.UpdateAdminPostRequest;
import com.rateit.backend.service.AdminPostService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/posts")
@RequiredArgsConstructor
public class AdminPostController {

    private final AdminPostService adminPostService;

    @GetMapping
    public ResponseEntity<Page<AdminPostDto>> listPosts(
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(adminPostService.list(pageable));
    }

    @PutMapping("/{postId}")
    public ResponseEntity<AdminPostDto> updatePost(
        @PathVariable long postId,
        @RequestBody UpdateAdminPostRequest request
    ) {
        return ResponseEntity.ok(adminPostService.updateAdminPost(postId, request));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(@PathVariable long postId) {
        adminPostService.deleteAdminPost(postId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<AdminDeletePostsResultDto> deletePosts(@RequestBody BulkDeleteAdminItemsRequest request) {
        return ResponseEntity.ok(adminPostService.deleteAdminPosts(request.ids()));
    }
}
