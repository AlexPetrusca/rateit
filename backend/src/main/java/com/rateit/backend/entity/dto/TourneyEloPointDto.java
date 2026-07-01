package com.rateit.backend.entity.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TourneyEloPointDto(
    Long tournamentId,
    String tournamentName,
    LocalDate tournamentDate,
    BigDecimal rating
) {
}
