package com.rateit.backend.service;

import com.rateit.backend.entity.TourneyTournament;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.TourneyTournamentDto;
import com.rateit.backend.entity.rest.CreateTourneyMatchRequest;
import com.rateit.backend.entity.types.TourneyTournamentFormat;
import com.rateit.backend.entity.types.TourneyTournamentMode;
import com.rateit.backend.entity.types.TourneyTournamentStatus;
import com.rateit.backend.exception.AuthorizationException;
import com.rateit.backend.repository.TourneyMatchRepository;
import com.rateit.backend.repository.TourneyPlayerRepository;
import com.rateit.backend.repository.TourneyTeamRepository;
import com.rateit.backend.repository.TourneyTournamentPlayerRepository;
import com.rateit.backend.repository.TourneyTournamentRepository;
import com.rateit.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TourneyServiceTest {

    @Mock private TourneyTournamentRepository tournamentRepository;
    @Mock private TourneyPlayerRepository playerRepository;
    @Mock private TourneyTournamentPlayerRepository tournamentPlayerRepository;
    @Mock private TourneyTeamRepository teamRepository;
    @Mock private TourneyMatchRepository matchRepository;
    @Mock private UserService userService;
    @Mock private UserRepository userRepository;
    @Mock private TourneyEloService tourneyEloService;

    private TourneyService tourneyService;

    @BeforeEach
    void setUp() {
        tourneyService = new TourneyService(
            tournamentRepository, playerRepository, tournamentPlayerRepository,
            teamRepository, matchRepository, userService, userRepository, tourneyEloService);
    }

    @Test
    void createMatchRejectsNonAdmin() {
        when(userService.findByPhoneNumber("+15550000000")).thenReturn(user("+15550000000", "ROLE_USER"));

        assertThrows(AuthorizationException.class,
            () -> tourneyService.createMatch(matchRequest(1L, 2L, 3L, 4L, 11, 9), "+15550000000"));
        verify(tournamentRepository, never()).save(org.mockito.ArgumentMatchers.any());
        verify(tourneyEloService, never()).regenerateAll();
    }

    @Test
    void createMatchRejectsDuplicatePlayers() {
        when(userService.findByPhoneNumber("+15550000000")).thenReturn(user("+15550000000", "ROLE_ADMIN"));

        // Player 2 appears on both teams.
        assertThrows(AuthorizationException.class,
            () -> tourneyService.createMatch(matchRequest(1L, 2L, 2L, 3L, 11, 9), "+15550000000"));
        verify(tourneyEloService, never()).regenerateAll();
    }

    @Test
    void createMatchRejectsTieGame() {
        when(userService.findByPhoneNumber("+15550000000")).thenReturn(user("+15550000000", "ROLE_ADMIN"));

        assertThrows(AuthorizationException.class,
            () -> tourneyService.createMatch(matchRequest(1L, 2L, 3L, 4L, 11, 11), "+15550000000"));
        verify(tourneyEloService, never()).regenerateAll();
    }

    private CreateTourneyMatchRequest matchRequest(long a1, long a2, long b1, long b2, int scoreA, int scoreB) {
        return new CreateTourneyMatchRequest(
            LocalDate.now(),
            "Court 1",
            "Friendly",
            "STANDARD",
            List.of(a1, a2),
            List.of(b1, b2),
            List.of(new CreateTourneyMatchRequest.GameScore(scoreA, scoreB)));
    }

    @Test
    void listTournamentsExcludesMatches() {
        when(userService.findByPhoneNumber("+15550000000")).thenReturn(user("+15550000000", "ROLE_ADMIN"));
        TourneyTournament tournament = tournament(1L, "Summer Series", false);
        TourneyTournament match = tournament(2L, "Match 07-05-2026", true);
        when(tournamentRepository.findAllByOrderByTournamentDateDescCreatedAtDesc()).thenReturn(List.of(tournament, match));
        when(tournamentPlayerRepository.countByTournament(tournament)).thenReturn(4L);
        when(teamRepository.countByTournament(tournament)).thenReturn(2L);
        when(matchRepository.findByTournamentOrderByRoundNumberAscIdAsc(tournament)).thenReturn(List.of());

        List<TourneyTournamentDto> result = tourneyService.listTournaments("+15550000000");

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).id());
        assertFalse(result.get(0).isMatch());
    }

    private TourneyTournament tournament(long id, String name, boolean isMatch) {
        TourneyTournament tournament = TourneyTournament.builder()
            .name(name)
            .status(TourneyTournamentStatus.COMPLETE)
            .format(TourneyTournamentFormat.PARTNER_SWAP)
            .mode(TourneyTournamentMode.LIVE)
            .isMatch(isMatch)
            .build();
        ReflectionTestUtils.setField(tournament, "id", id);
        return tournament;
    }

    private User user(String phoneNumber, String role) {
        User user = User.builder()
            .phoneNumber(phoneNumber)
            .username("admin")
            .role(role)
            .build();
        ReflectionTestUtils.setField(user, "id", 100L);
        return user;
    }
}
