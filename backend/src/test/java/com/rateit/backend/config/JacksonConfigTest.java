package com.rateit.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JacksonConfigTest {

    @Test
    void objectMapperRegistersJavaTimeModules() throws Exception {
        ObjectMapper objectMapper = new JacksonConfig().objectMapper();

        String json = objectMapper.writeValueAsString(new Payload(Instant.parse("2025-01-01T00:00:00Z")));
        Payload payload = objectMapper.readValue(json, Payload.class);

        assertEquals(Instant.parse("2025-01-01T00:00:00Z"), payload.createdAt());
    }

    private record Payload(Instant createdAt) {}
}
