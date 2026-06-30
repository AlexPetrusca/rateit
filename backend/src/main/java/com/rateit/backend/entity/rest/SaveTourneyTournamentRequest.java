package com.rateit.backend.entity.rest;

import com.rateit.backend.entity.types.TourneyTournamentFormat;
import com.rateit.backend.entity.types.TourneyTournamentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SaveTourneyTournamentRequest(
    @NotBlank @Size(max = 160) String name,
    @Size(max = 160) String location,
    LocalDate tournamentDate,
    TourneyTournamentStatus status,
    TourneyTournamentFormat format,
    @Size(max = 4000) String notes
) {
}
