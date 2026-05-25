package com.rateit.backend.controller;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.rest.VerifyOtpRequest;
import com.rateit.backend.service.CookieService;
import com.rateit.backend.service.JwtService;
import com.rateit.backend.service.UserService;
import com.rateit.backend.service.otp.OtpService;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private OtpService otpService;

    @Mock
    private JwtService jwtService;

    @Mock
    private CookieService cookieService;

    @Mock
    private UserService userService;

    @InjectMocks
    private AuthController authController;

    @Test
    void loginIncludesAdminAuthorityWhenUserRoleIsAdmin() {
        String phoneNumber = "+15551234567";
        VerifyOtpRequest request = new VerifyOtpRequest(phoneNumber, "123456");
        ResponseCookie authCookie = ResponseCookie.from("AUTH_TOKEN", "jwt").build();

        when(userService.findByPhoneNumberIncludingDeleted(phoneNumber)).thenReturn(Optional.of(User.builder()
            .phoneNumber(phoneNumber)
            .username("admin")
            .role("ROLE_ADMIN")
            .build()));
        when(jwtService.generateToken(eq(phoneNumber), anyList())).thenReturn("jwt");
        when(cookieService.getAuthCookie("jwt")).thenReturn(authCookie);

        MockHttpServletResponse response = new MockHttpServletResponse();
        authController.login(request, response);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<String>> authoritiesCaptor = ArgumentCaptor.forClass(List.class);
        verify(jwtService).generateToken(eq(phoneNumber), authoritiesCaptor.capture());

        assertThat(authoritiesCaptor.getValue()).containsExactly("ROLE_USER", "ROLE_ADMIN");
    }

    @Test
    void loginFallsBackToUserAuthorityWhenProfileIsMissing() {
        String phoneNumber = "+15551234567";
        VerifyOtpRequest request = new VerifyOtpRequest(phoneNumber, "123456");
        ResponseCookie authCookie = ResponseCookie.from("AUTH_TOKEN", "jwt").build();

        when(userService.findByPhoneNumberIncludingDeleted(phoneNumber)).thenReturn(Optional.empty());
        when(jwtService.generateToken(eq(phoneNumber), anyList())).thenReturn("jwt");
        when(cookieService.getAuthCookie("jwt")).thenReturn(authCookie);

        MockHttpServletResponse response = new MockHttpServletResponse();
        authController.login(request, response);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<String>> authoritiesCaptor = ArgumentCaptor.forClass(List.class);
        verify(jwtService).generateToken(eq(phoneNumber), authoritiesCaptor.capture());

        assertThat(authoritiesCaptor.getValue()).containsExactly("ROLE_USER");
    }
}
