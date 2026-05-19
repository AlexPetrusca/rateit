package com.rateit.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "integration.twilio")
public record TwilioProperties (
    String accountSid,
    String authToken,
    String serviceSid
) {}
