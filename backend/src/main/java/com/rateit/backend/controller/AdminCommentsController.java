package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.AdminCommentDto;
import com.rateit.backend.entity.rest.UpdateAdminCommentRequest;
import com.rateit.backend.service.AdminCommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/comments")
@RequiredArgsConstructor
public class AdminCommentsController {

    private final AdminCommentService adminCommentService;

    @GetMapping
    public ResponseEntity<Page<AdminCommentDto>> list(Pageable pageable) {
        return ResponseEntity.ok(adminCommentService.list(pageable));
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<AdminCommentDto> update(@PathVariable long commentId, @RequestBody @Valid UpdateAdminCommentRequest request) {
        return ResponseEntity.ok(adminCommentService.updateAdminComment(commentId, request));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> delete(@PathVariable long commentId) {
        adminCommentService.deleteAdminComment(commentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<Map<String, Integer>> bulkDelete(@RequestBody Map<String, List<Long>> request) {
        int deletedCount = adminCommentService.deleteAdminComments(request.getOrDefault("ids", List.of()));
        return ResponseEntity.ok(Map.of("deletedCount", deletedCount));
    }
}
