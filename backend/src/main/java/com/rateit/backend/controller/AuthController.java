package com.rateit.backend.controller;

import com.rateit.backend.entity.rest.SendOtpRequest;
import com.rateit.backend.entity.rest.VerifyOtpRequest;
import com.rateit.backend.entity.types.OtpChannel;
import com.rateit.backend.exception.BadRequestException;
import com.rateit.backend.service.CookieService;
import com.rateit.backend.service.JwtService;
import com.rateit.backend.service.UserService;
import com.rateit.backend.service.otp.OtpService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.ArrayList;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final OtpService otpService;
    private final JwtService jwtService;
    private final CookieService cookieService;
    private final UserService userService;

    @PostMapping("/send_otp")
    public ResponseEntity<Void> sendOtp(@RequestBody @Valid SendOtpRequest req) {
        otpService.sendOtp(req.phoneNumber(), OtpChannel.SMS);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public ResponseEntity<Void> login(@RequestBody @Valid VerifyOtpRequest req, HttpServletResponse response) {
        otpService.verifyOtp(req.phoneNumber(), req.code());

        List<String> authorities = new ArrayList<>(List.of("ROLE_USER"));
        userService.findByPhoneNumberIncludingDeleted(req.phoneNumber())
            .ifPresent(user -> {
                if (user.getDeletedAt() != null) {
                    throw BadRequestException.invalidRequest("This account has been deleted");
                }

                String role = user.getRole();
                if (role != null && !role.isBlank() && !"ROLE_USER".equals(role)) {
                    authorities.add(role);
                }
            });

        String jwt = jwtService.generateToken(req.phoneNumber(), authorities);
        ResponseCookie authCookie = cookieService.getAuthCookie(jwt);

        response.addHeader(HttpHeaders.SET_COOKIE, authCookie.toString());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        ResponseCookie cookie = cookieService.getEmptyAuthCookie();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ResponseEntity.noContent().build();
    }
}
