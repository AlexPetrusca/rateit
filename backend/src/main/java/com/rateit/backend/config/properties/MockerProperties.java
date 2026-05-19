package com.rateit.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "integration.mocker")
public record MockerProperties(
    String endpoint
) {}
