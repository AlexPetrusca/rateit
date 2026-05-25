package com.rateit.backend.config;

import com.rateit.backend.entity.User;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.security.SessionRefreshFilter;
import com.rateit.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.ArrayList;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final BearerTokenResolver bearerTokenResolver;
    private final UserService userService;
    private final SessionRefreshFilter sessionRefreshFilter;

    @Bean
    @Order(1)
    public SecurityFilterChain publicAuthChain(HttpSecurity http) {
        http.securityMatcher("/auth/**", "/actuator/prometheus", "/swagger-ui/**", "/v3/api-docs/**")
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll()); // no auth needed
        return http.build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain apiChain(HttpSecurity http) {
        http.csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")
                .anyRequest().authenticated()) // require auth
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // no sessions
            .oauth2ResourceServer(oauth2 -> oauth2
                .bearerTokenResolver(bearerTokenResolver) // get jwt from cookie if present
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())) // verify jwt token
            )
            .addFilterAfter(sessionRefreshFilter, BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter authenticationConverter = new JwtAuthenticationConverter();
        authenticationConverter.setJwtGrantedAuthoritiesConverter(jwt -> {
            List<String> authorities = getCurrentAuthorities(jwt.getSubject());
            return authorities.stream()
                .map(SimpleGrantedAuthority::new)
                .map(GrantedAuthority.class::cast)
                .toList();
        });
        return authenticationConverter;
    }

    private List<String> getCurrentAuthorities(String phoneNumber) {
        List<String> authorities = new ArrayList<>(List.of("ROLE_USER"));

        try {
            User user = userService.findByPhoneNumber(phoneNumber);
            if ("ROLE_ADMIN".equals(user.getRole())) {
                authorities.add("ROLE_ADMIN");
            }
        } catch (ResourceNotFoundException ignored) {
            // Users without a profile stay on the base role.
        }

        return authorities;
    }
}
