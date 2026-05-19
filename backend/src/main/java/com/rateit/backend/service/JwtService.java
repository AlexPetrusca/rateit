package com.rateit.backend.service;

import com.rateit.backend.config.properties.SessionProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtEncoder encoder;
    private final SessionProperties sessionProps;

    public String generateToken(String phoneNumber, List<String> authorities) {
        Instant now = Instant.now();
        String scope = String.join(" ", authorities);
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("self")
            .issuedAt(now)
            .expiresAt(now.plus(sessionProps.duration()))
            .subject(phoneNumber)
            .claim("scope", scope)
            .build();

        return this.encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
}