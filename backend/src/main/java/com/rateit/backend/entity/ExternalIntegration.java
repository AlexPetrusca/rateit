package com.rateit.backend.entity;

import com.rateit.backend.entity.types.ExternalProvider;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)

@Entity
@Table(
    name = "external_integrations",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_external_integrations_provider", columnNames = {"provider"})
    }
)
public class ExternalIntegration extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private ExternalProvider provider;

    @Column(name = "display_name", nullable = false)
    private String displayName;
}
