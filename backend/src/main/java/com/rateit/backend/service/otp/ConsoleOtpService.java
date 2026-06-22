package com.rateit.backend.service.otp;

import com.rateit.backend.entity.types.OtpChannel;
import com.rateit.backend.exception.ErrorCode;
import com.rateit.backend.exception.OtpException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.random.RandomGenerator;

@Service
@Profile("local")
@Slf4j
public class ConsoleOtpService implements OtpService {

    private final ConcurrentHashMap<String, String> codes = new ConcurrentHashMap<>();
    private final RandomGenerator rng = RandomGenerator.getDefault();

    @Override
    public void sendOtp(String phone, OtpChannel channel) {
        String code = String.format("%06d", rng.nextInt(1_000_000));
        codes.put(phone, code);
        log.info("OTP for {}: {}", phone, code);
    }

    @Override
    public void verifyOtp(String phone, String code) {
        String expected = codes.remove(phone);
        if (expected == null || !expected.equals(code)) {
            throw OtpException.userError("The code provided is incorrect or has expired.", ErrorCode.INVALID_OTP_CODE);
        }
    }
}
