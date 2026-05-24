package com.rateit.backend.config;

import com.rateit.backend.config.properties.AuthCookieProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.util.StringUtils;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

@Configuration
@RequiredArgsConstructor
public class BearerTokenResolverConfig {

    private final AuthCookieProperties authCookieProps;

    @Bean
    public BearerTokenResolver bearerTokenResolver() {
        return (HttpServletRequest request) -> {
            // 1) Authorization header (standard)
            String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }

            // 2) Cookie fallback
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    if (authCookieProps.name().equals(cookie.getName())) {
                        String token = cookie.getValue();
                        if (StringUtils.hasText(token)) {
                            return token;
                        }
                        break;
                    }
                }
            }

            // 3) Query param fallback (for websocket)
            String param = request.getParameter("access_token");
            if (StringUtils.hasText(param)) {
                return param;
            }

            return null; // no token found
        };
    }
}

