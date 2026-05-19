package com.rateit.backend.service.otp;

import com.rateit.backend.config.properties.MockerProperties;
import com.rateit.backend.entity.types.OtpChannel;
import com.rateit.backend.exception.ErrorCode;
import com.rateit.backend.exception.OtpException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
@Profile("mocker")
@Slf4j
public class MockerService implements OtpService {

    private final MockerProperties mockerProperties;
    private final WebClient webClient;

    @Override
    public void sendOtp(String phone, OtpChannel channel) {
        try {
            webClient.post()
                .uri(mockerProperties.endpoint() + "/verification/send")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new SendOtpRequest(phone))
                .retrieve()
                .onStatus(HttpStatusCode::isError, response ->
                    response.bodyToMono(String.class)
                        .defaultIfEmpty("Unknown error")
                        .flatMap(errorBody -> Mono.error(
                            OtpException.providerError("Mocker error: " + errorBody)
                        ))
                )
                .bodyToMono(Void.class)
                .block();
        } catch (Exception e) {
            throw OtpException.providerUnavailable("SMS delivery failed due to a provider error.", e);
        }
    }

    @Override
    public void verifyOtp(String phone, String code) {
        try {
            VerifyOtpResponse verifyResponse = webClient.post()
                .uri(mockerProperties.endpoint() + "/verification/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new VerifyOtpRequest(phone, code))
                .retrieve()
                .onStatus(HttpStatusCode::isError, response ->
                    response.bodyToMono(String.class)
                        .defaultIfEmpty("Unknown error")
                        .flatMap(errorBody -> Mono.error(
                            OtpException.userError("The code provided is incorrect or has expired.", ErrorCode.INVALID_OTP_CODE)
                        ))
                )
                .bodyToMono(VerifyOtpResponse.class)
                .block();

            if (verifyResponse == null || !verifyResponse.valid) {
                throw OtpException.userError("The code provided is incorrect or has expired.", ErrorCode.INVALID_OTP_CODE);
            }
        } catch (OtpException e) {
            throw e;
        } catch (Exception e) {
            throw OtpException.providerUnavailable("OTP code verification failed due to a provider error.", e);
        }
    }

    public record SendOtpRequest(String to) {}

    public record VerifyOtpRequest(String to, String code) {}

    public record VerifyOtpResponse(Boolean valid, String message) {}
}
