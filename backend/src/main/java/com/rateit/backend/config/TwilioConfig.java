package com.rateit.backend.config;

import com.twilio.Twilio;
import com.twilio.exception.ApiException;
import com.twilio.rest.verify.v2.Service;
import com.rateit.backend.config.properties.TwilioProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import jakarta.annotation.PostConstruct;

@Configuration
@Profile("twilio")
@Slf4j
@RequiredArgsConstructor
public class TwilioConfig {

    private final TwilioProperties twilioProps;

    @PostConstruct
    public void initTwilio() {
        Twilio.init(twilioProps.accountSid(), twilioProps.authToken());
        try {
            Service.updater(twilioProps.serviceSid())
                .setFriendlyName("Critic")
                .update(Twilio.getRestClient());
        } catch (ApiException e) {
            log.warn("Unable to update Twilio Verify service branding for {}.", twilioProps.serviceSid(), e);
        }
    }
}
