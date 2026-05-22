package com.rateit.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)

@Entity
@Table(
    name = "follows",
    indexes = {
        @Index(name = "idx_follows_follower_user_id", columnList = "follower_user_id"),
        @Index(name = "idx_follows_followed_user_id", columnList = "followed_user_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_follows_follower_followed", columnNames = {"follower_user_id", "followed_user_id"})
    }
)
public class Follow extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "follower_user_id", nullable = false)
    private User followerUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "followed_user_id", nullable = false)
    private User followedUser;
}
