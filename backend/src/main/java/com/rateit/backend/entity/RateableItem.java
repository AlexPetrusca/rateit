package com.rateit.backend.entity;

import com.rateit.backend.entity.types.RateableItemType;
import com.rateit.backend.entity.types.Visibility;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)

@Entity
@Table(
    name = "rateable_items",
    indexes = {
        @Index(name = "idx_rateable_items_created_by_user_id", columnList = "created_by_user_id"),
        @Index(name = "idx_rateable_items_media_asset_id", columnList = "media_asset_id"),
        @Index(name = "idx_rateable_items_source_external_id", columnList = "source_external_id")
    }
)
public class RateableItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdByUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    private RateableItemType itemType;

    @Column(name = "title")
    private String title;

    @Column(name = "body", columnDefinition = "text")
    private String body;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "media_asset_id")
    private MediaAsset mediaAsset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_integration_id")
    private ExternalIntegration sourceIntegration;

    @Column(name = "source_external_id")
    private String sourceExternalId;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private Visibility visibility;
}
