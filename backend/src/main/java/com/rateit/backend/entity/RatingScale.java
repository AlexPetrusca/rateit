package com.rateit.backend.entity;

import com.rateit.backend.entity.types.RatingScaleType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)

@Entity
@Table(
    name = "rating_scales",
    indexes = {
        @Index(name = "idx_rating_scales_owner_user_id", columnList = "owner_user_id")
    }
)
public class RatingScale extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private User ownerUser;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "scale_type", nullable = false)
    private RatingScaleType scaleType;

    @Column(name = "min_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal minValue;

    @Column(name = "max_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal maxValue;

    @Column(name = "step", nullable = false, precision = 10, scale = 2)
    private BigDecimal step;

    @Column(name = "symbol")
    private String symbol;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault;
}
