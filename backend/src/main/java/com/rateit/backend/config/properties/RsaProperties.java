package com.rateit.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "security.auth.rsa")
public record RsaProperties(
    String publicKey,
    String privateKey
) {}