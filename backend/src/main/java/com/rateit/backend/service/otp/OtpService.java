package com.rateit.backend.service.otp;

import com.rateit.backend.entity.types.OtpChannel;

public interface OtpService {

    void sendOtp(String phone, OtpChannel channel);

    void verifyOtp(String phone, String code);
}
