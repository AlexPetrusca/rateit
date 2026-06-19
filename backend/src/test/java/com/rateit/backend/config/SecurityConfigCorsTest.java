package com.rateit.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class SecurityConfigCorsTest {

    @Test
    void allowsLocalDevelopmentPortsOnly() {
        var source = new SecurityConfig(null, null, null).corsConfigurationSource();
        var request = new MockHttpServletRequest("OPTIONS", "/auth/send_otp");
        var cors = source.getCorsConfiguration(request);

        assertNotNull(cors);
        assertEquals("http://localhost:3003", cors.checkOrigin("http://localhost:3003"));
        assertEquals("http://127.0.0.1:5173", cors.checkOrigin("http://127.0.0.1:5173"));
        assertNull(cors.checkOrigin("http://example.com:3003"));
    }
}
