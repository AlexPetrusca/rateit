package com.rateit.backend.controller;

import com.rateit.backend.entity.dto.TourneyCriticUserDto;
import com.rateit.backend.entity.dto.TourneyLeaderboardRowDto;
import com.rateit.backend.entity.dto.TourneyEloPointDto;
import com.rateit.backend.entity.dto.TourneyPlayerDto;
import com.rateit.backend.entity.dto.TourneyTournamentDto;
import com.rateit.backend.entity.rest.AddTourneyTournamentPlayerRequest;
import com.rateit.backend.entity.rest.CommitTourneyRoundRequest;
import com.rateit.backend.entity.rest.EditTourneyTournamentRequest;
import com.rateit.backend.entity.rest.SaveTourneyPlayerRequest;
import com.rateit.backend.entity.rest.SaveTourneyTeamRequest;
import com.rateit.backend.entity.rest.SaveTourneyTournamentRequest;
import com.rateit.backend.entity.rest.UpdateTourneyMatchScoreRequest;
import com.rateit.backend.service.TourneyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tourney")
@RequiredArgsConstructor
public class TourneyController {

    private final TourneyService tourneyService;

    @GetMapping("/players")
    public ResponseEntity<List<TourneyPlayerDto>> listPlayers(JwtAuthenticationToken token) {
        return ResponseEntity.ok(tourneyService.listPlayers(token.getToken().getSubject()));
    }

    @GetMapping("/critic-users")
    public ResponseEntity<List<TourneyCriticUserDto>> listCriticUsers(JwtAuthenticationToken token) {
        return ResponseEntity.ok(tourneyService.listCriticUsers(token.getToken().getSubject()));
    }

    @GetMapping("/elo/me")
    public ResponseEntity<List<TourneyEloPointDto>> getMyEloHistory(JwtAuthenticationToken token) {
        return ResponseEntity.ok(tourneyService.getMyEloHistory(token.getToken().getSubject()));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<TourneyLeaderboardRowDto>> getLeaderboard(JwtAuthenticationToken token) {
        return ResponseEntity.ok(tourneyService.getLeaderboard());
    }

    @PostMapping("/players")
    public ResponseEntity<TourneyPlayerDto> createPlayer(
        @RequestBody @Valid SaveTourneyPlayerRequest request,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(tourneyService.createPlayer(request, token.getToken().getSubject()));
    }

    @GetMapping("/tournaments")
    public ResponseEntity<List<TourneyTournamentDto>> listTournaments(JwtAuthenticationToken token) {
        return ResponseEntity.ok(tourneyService.listTournaments(token.getToken().getSubject()));
    }

    @PostMapping("/tournaments")
    public ResponseEntity<TourneyTournamentDto> createTournament(
        @RequestBody @Valid SaveTourneyTournamentRequest request,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(tourneyService.createTournament(request, token.getToken().getSubject()));
    }

    @GetMapping("/tournaments/{tournamentId}")
    public ResponseEntity<TourneyTournamentDto> getTournament(
        @PathVariable Long tournamentId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(tourneyService.getTournamentDetail(tournamentId, token.getToken().getSubject()));
    }

    @PutMapping("/tournaments/{tournamentId}")
    public ResponseEntity<TourneyTournamentDto> updateTournament(
        @PathVariable Long tournamentId,
        @RequestBody @Valid SaveTourneyTournamentRequest request,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(tourneyService.updateTournament(tournamentId, request, token.getToken().getSubject()));
    }

    @PutMapping("/tournaments/{tournamentId}/full")
    public ResponseEntity<TourneyTournamentDto> editTournament(
        @PathVariable Long tournamentId,
        @RequestBody @Valid EditTourneyTournamentRequest request,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(tourneyService.editTournament(tournamentId, request, token.getToken().getSubject()));
    }

    @DeleteMapping("/tournaments/{tournamentId}")
    public ResponseEntity<Void> deleteTournament(
        @PathVariable Long tournamentId,
        JwtAuthenticationToken token
    ) {
        tourneyService.deleteTournament(tournamentId, token.getToken().getSubject());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/tournaments/{tournamentId}/players")
    public ResponseEntity<TourneyTournamentDto> addTournamentPlayer(
        @PathVariable Long tournamentId,
        @RequestBody @Valid AddTourneyTournamentPlayerRequest request,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(tourneyService.addTournamentPlayer(tournamentId, request, token.getToken().getSubject()));
    }

    @DeleteMapping("/tournaments/{tournamentId}/players/{playerId}")
    public ResponseEntity<TourneyTournamentDto> deleteTournamentPlayer(
        @PathVariable Long tournamentId,
        @PathVariable Long playerId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(tourneyService.deleteTournamentPlayer(tournamentId, playerId, token.getToken().getSubject()));
    }

    @PostMapping("/tournaments/{tournamentId}/rounds")
    public ResponseEntity<TourneyTournamentDto> commitRound(
        @PathVariable Long tournamentId,
        @RequestBody @Valid CommitTourneyRoundRequest request,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(tourneyService.commitRound(tournamentId, request, token.getToken().getSubject()));
    }

    @DeleteMapping("/tournaments/{tournamentId}/matches/{matchId}")
    public ResponseEntity<TourneyTournamentDto> deleteMatch(
        @PathVariable Long tournamentId,
        @PathVariable Long matchId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(tourneyService.deleteMatch(tournamentId, matchId, token.getToken().getSubject()));
    }

    @PostMapping("/tournaments/{tournamentId}/teams")
    public ResponseEntity<TourneyTournamentDto> addTeam(
        @PathVariable Long tournamentId,
        @RequestBody @Valid SaveTourneyTeamRequest request,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(tourneyService.addTeam(tournamentId, request, token.getToken().getSubject()));
    }

    @PostMapping("/tournaments/{tournamentId}/teams/partner-swap")
    public ResponseEntity<TourneyTournamentDto> generatePartnerSwapTeams(
        @PathVariable Long tournamentId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(tourneyService.generatePartnerSwapTeams(tournamentId, token.getToken().getSubject()));
    }

    @DeleteMapping("/tournaments/{tournamentId}/teams/{teamId}")
    public ResponseEntity<TourneyTournamentDto> deleteTeam(
        @PathVariable Long tournamentId,
        @PathVariable Long teamId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(tourneyService.deleteTeam(tournamentId, teamId, token.getToken().getSubject()));
    }

    @PostMapping("/tournaments/{tournamentId}/schedule")
    public ResponseEntity<TourneyTournamentDto> generateSchedule(
        @PathVariable Long tournamentId,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(tourneyService.generateRoundRobinSchedule(tournamentId, token.getToken().getSubject()));
    }

    @PutMapping("/tournaments/{tournamentId}/matches/{matchId}/score")
    public ResponseEntity<TourneyTournamentDto> updateMatchScore(
        @PathVariable Long tournamentId,
        @PathVariable Long matchId,
        @RequestBody @Valid UpdateTourneyMatchScoreRequest request,
        JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(tourneyService.updateMatchScore(
            tournamentId,
            matchId,
            request,
            token.getToken().getSubject()
        ));
    }
}
