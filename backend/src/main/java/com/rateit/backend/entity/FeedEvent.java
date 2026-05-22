package com.rateit.backend.entity;

import com.rateit.backend.entity.types.FeedEventType;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)

@Entity
@Table(
    name = "feed_events",
    indexes = {
        @Index(name = "idx_feed_events_actor_user_id", columnList = "actor_user_id"),
        @Index(name = "idx_feed_events_rating_id", columnList = "rating_id"),
        @Index(name = "idx_feed_events_rateable_item_id", columnList = "rateable_item_id")
    }
)
public class FeedEvent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_user_id", nullable = false)
    private User actorUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private FeedEventType eventType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rating_id")
    private Rating rating;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rateable_item_id")
    private RateableItem rateableItem;
}
