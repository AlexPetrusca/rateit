package com.rateit.backend.controller;

import com.rateit.backend.entity.rest.SendOtpRequest;
import com.rateit.backend.entity.rest.VerifyOtpRequest;
import com.rateit.backend.service.CookieService;
import com.rateit.backend.service.AuthService;
import com.rateit.backend.service.JwtService;
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

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final CookieService cookieService;

    @PostMapping("/send_otp")
    public ResponseEntity<Void> sendOtp(@RequestBody @Valid SendOtpRequest req) {
        authService.sendOtp(req.phoneNumber());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public ResponseEntity<Void> login(@RequestBody @Valid VerifyOtpRequest req, HttpServletResponse response) {
        var authorities = authService.authenticate(req.phoneNumber(), req.code());
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
