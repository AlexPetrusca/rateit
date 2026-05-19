package com.rateit.backend.config;

import com.twilio.Twilio;
import com.rateit.backend.config.properties.TwilioProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;

@Configuration
@RequiredArgsConstructor
public class TwilioConfig {

    private final TwilioProperties twilioProps;

    @PostConstruct
    public void initTwilio() {
        Twilio.init(twilioProps.accountSid(), twilioProps.authToken());
    }
}
