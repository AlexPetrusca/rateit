package com.rateit.backend.controller;

import com.rateit.backend.entity.rest.SendOtpRequest;
import com.rateit.backend.entity.rest.VerifyOtpRequest;
import com.rateit.backend.service.AuthService;
import com.rateit.backend.service.CookieService;
import com.rateit.backend.service.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseCookie;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @Mock
    private JwtService jwtService;

    @Mock
    private CookieService cookieService;

    @InjectMocks
    private AuthController authController;

    @Test
    void sendOtpDelegatesToAuthService() {
        authController.sendOtp(new SendOtpRequest("+15551234567"));

        verify(authService).sendOtp("+15551234567");
    }

    @Test
    void loginUsesAuthoritiesFromAuthService() {
        String phoneNumber = "+15551234567";
        VerifyOtpRequest request = new VerifyOtpRequest(phoneNumber, "123456");
        ResponseCookie authCookie = ResponseCookie.from("AUTH_TOKEN", "jwt").build();

        when(authService.authenticate(phoneNumber, "123456")).thenReturn(List.of("ROLE_USER", "ROLE_ADMIN"));
        when(jwtService.generateToken(eq(phoneNumber), eq(List.of("ROLE_USER", "ROLE_ADMIN")))).thenReturn("jwt");
        when(cookieService.getAuthCookie("jwt")).thenReturn(authCookie);

        MockHttpServletResponse response = new MockHttpServletResponse();
        authController.login(request, response);

        verify(authService).authenticate(phoneNumber, "123456");
        verify(jwtService).generateToken(eq(phoneNumber), eq(List.of("ROLE_USER", "ROLE_ADMIN")));
        assertThat(response.getHeader("Set-Cookie")).contains("AUTH_TOKEN=jwt");
    }

    @Test
    void logoutClearsAuthCookie() {
        ResponseCookie emptyCookie = ResponseCookie.from("AUTH_TOKEN", "").build();
        when(cookieService.getEmptyAuthCookie()).thenReturn(emptyCookie);

        MockHttpServletResponse response = new MockHttpServletResponse();
        authController.logout(response);

        assertThat(response.getHeader("Set-Cookie")).contains("AUTH_TOKEN=");
    }
}
