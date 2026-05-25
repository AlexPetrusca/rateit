package com.rateit.backend.security;

import com.rateit.backend.service.CookieService;
import com.rateit.backend.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Component
public class SessionRefreshFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CookieService cookieService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthenticationToken)) {
            filterChain.doFilter(request, response);
            return;
        }

        Jwt jwt = jwtAuthenticationToken.getToken();
        String phoneNumber = jwt.getSubject();
        if (phoneNumber == null || phoneNumber.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        List<String> currentAuthorities = jwtAuthenticationToken.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());
        List<String> tokenAuthorities = parseAuthorities(jwt.getClaimAsString("scope"));

        if (!currentAuthorities.equals(tokenAuthorities)) {
            String refreshedJwt = jwtService.generateToken(phoneNumber, currentAuthorities);
            response.addHeader("Set-Cookie", cookieService.getAuthCookie(refreshedJwt).toString());
        }

        filterChain.doFilter(request, response);
    }

    private List<String> parseAuthorities(String scope) {
        if (scope == null || scope.isBlank()) {
            return List.of();
        }

        return List.of(scope.split("\\s+"));
    }
}
