package com.rateit.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)

@Entity
@Table(
    name = "rating_comment_likes",
    indexes = {
        @Index(name = "idx_rating_comment_likes_comment_id", columnList = "comment_id"),
        @Index(name = "idx_rating_comment_likes_user_id", columnList = "user_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_rating_comment_likes_comment_user", columnNames = {"comment_id", "user_id"})
    }
)
public class RatingCommentLike extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comment_id", nullable = false)
    private RatingComment comment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
