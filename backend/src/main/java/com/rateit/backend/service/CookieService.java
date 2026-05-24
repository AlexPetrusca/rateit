package com.rateit.backend.service;

import com.rateit.backend.config.properties.AuthCookieProperties;
import com.rateit.backend.config.properties.SessionProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CookieService {

    private final AuthCookieProperties authCookieProps;
    private final SessionProperties sessionProps;

    public ResponseCookie getAuthCookie(String jwt) {
        return ResponseCookie.from(authCookieProps.name(), jwt)
            .httpOnly(true)
            .secure(authCookieProps.secure())
            .sameSite(authCookieProps.sameSite())
            .maxAge(sessionProps.duration())
            .path("/")
            .build();
    }

    public ResponseCookie getEmptyAuthCookie() {
        return ResponseCookie.from(authCookieProps.name(), "")
            .httpOnly(true)
            .secure(authCookieProps.secure())
            .sameSite(authCookieProps.sameSite())
            .maxAge(0)
            .path("/")
            .build();
    }
}
