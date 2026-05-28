package com.rateit.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)

@Entity
@Table(
    name = "rating_comments",
    indexes = {
        @Index(name = "idx_rating_comments_rating_id", columnList = "rating_id"),
        @Index(name = "idx_rating_comments_author_user_id", columnList = "author_user_id"),
        @Index(name = "idx_rating_comments_parent_comment_id", columnList = "parent_comment_id")
    }
)
public class RatingComment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rating_id", nullable = false)
    private Rating rating;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_user_id", nullable = false)
    private User authorUser;

    @Column(name = "text", nullable = false, columnDefinition = "text")
    private String text;

    @Column(name = "score", precision = 10, scale = 2)
    private BigDecimal score;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private RatingComment parentComment;

    @Builder.Default
    @OneToMany(mappedBy = "parentComment")
    private List<RatingComment> replies = new ArrayList<>();
}
