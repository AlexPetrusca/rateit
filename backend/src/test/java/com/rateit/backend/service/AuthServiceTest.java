package com.rateit.backend.service;

import com.rateit.backend.entity.User;
import com.rateit.backend.exception.BadRequestException;
import com.rateit.backend.service.otp.OtpService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private OtpService otpService;

    @Mock
    private UserService userService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(otpService, userService);
    }

    @Test
    void sendOtpSkipsProviderForTestUsers() {
        String phoneNumber = "+15551234567";
        when(userService.findByPhoneNumberIncludingDeleted(phoneNumber)).thenReturn(Optional.of(User.builder()
            .phoneNumber(phoneNumber)
            .username("test_user")
            .role("ROLE_TEST_USER")
            .build()));

        authService.sendOtp(phoneNumber);

        verify(otpService, never()).sendOtp(phoneNumber, com.rateit.backend.entity.types.OtpChannel.SMS);
    }

    @Test
    void authenticateAllowsZeroCodeForTestUsers() {
        String phoneNumber = "+15551234567";
        when(userService.findByPhoneNumberIncludingDeleted(phoneNumber)).thenReturn(Optional.of(User.builder()
            .phoneNumber(phoneNumber)
            .username("test_user")
            .role("ROLE_TEST_USER")
            .build()));

        List<String> authorities = authService.authenticate(phoneNumber, "000000");

        assertEquals(List.of("ROLE_USER", "ROLE_TEST_USER"), authorities);
        verify(otpService, never()).verifyOtp(phoneNumber, "000000");
    }

    @Test
    void authenticateRejectsWrongCodeForTestUsers() {
        String phoneNumber = "+15551234567";
        when(userService.findByPhoneNumberIncludingDeleted(phoneNumber)).thenReturn(Optional.of(User.builder()
            .phoneNumber(phoneNumber)
            .username("test_user")
            .role("ROLE_TEST_USER")
            .build()));

        assertThrows(BadRequestException.class, () -> authService.authenticate(phoneNumber, "123456"));
        verify(otpService, never()).verifyOtp(phoneNumber, "123456");
    }

    @Test
    void authenticateUsesOtpForNormalUsers() {
        String phoneNumber = "+15551234567";
        when(userService.findByPhoneNumberIncludingDeleted(phoneNumber)).thenReturn(Optional.of(User.builder()
            .phoneNumber(phoneNumber)
            .username("alpha")
            .role("ROLE_ADMIN")
            .build()));

        List<String> authorities = authService.authenticate(phoneNumber, "123456");

        verify(otpService).verifyOtp(phoneNumber, "123456");
        assertEquals(List.of("ROLE_USER", "ROLE_ADMIN"), authorities);
    }

    @Test
    void authenticateRejectsDeletedAccounts() {
        String phoneNumber = "+15551234567";
        when(userService.findByPhoneNumberIncludingDeleted(phoneNumber)).thenReturn(Optional.of(User.builder()
            .phoneNumber(phoneNumber)
            .username("alpha")
            .role("ROLE_USER")
            .deletedAt(java.time.Instant.now())
            .build()));

        assertThrows(BadRequestException.class, () -> authService.authenticate(phoneNumber, "123456"));
        verify(otpService, never()).verifyOtp(phoneNumber, "123456");
    }
}
