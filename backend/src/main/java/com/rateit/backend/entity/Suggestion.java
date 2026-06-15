package com.rateit.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
    name = "suggestions",
    indexes = {
        @Index(name = "idx_suggestions_author_user_id", columnList = "author_user_id"),
        @Index(name = "idx_suggestions_created_at", columnList = "created_at")
    }
)
public class Suggestion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_user_id", nullable = false)
    private User authorUser;

    @Column(name = "title", nullable = false, columnDefinition = "text")
    private String title;

    @Column(name = "body", nullable = false, columnDefinition = "text")
    private String body;
}
