package com.rateit.backend.entity;

import com.rateit.backend.entity.types.FriendshipStatus;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)

@Entity
@Table(
    name = "friendships",
    indexes = {
        @Index(name = "idx_friendships_requester_user_id", columnList = "requester_user_id"),
        @Index(name = "idx_friendships_addressee_user_id", columnList = "addressee_user_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_friendships_requester_addressee", columnNames = {"requester_user_id", "addressee_user_id"})
    }
)
public class Friendship extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_user_id", nullable = false)
    private User requesterUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "addressee_user_id", nullable = false)
    private User addresseeUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private FriendshipStatus status;
}
