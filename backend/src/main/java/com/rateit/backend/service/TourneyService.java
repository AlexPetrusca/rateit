package com.rateit.backend.service;

import com.rateit.backend.entity.TourneyMatch;
import com.rateit.backend.entity.TourneyPlayer;
import com.rateit.backend.entity.TourneyTeam;
import com.rateit.backend.entity.TourneyTournament;
import com.rateit.backend.entity.TourneyTournamentPlayer;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.TourneyCriticUserDto;
import com.rateit.backend.entity.dto.TourneyMatchDto;
import com.rateit.backend.entity.dto.TourneyPlayerDto;
import com.rateit.backend.entity.dto.TourneyPlayerStandingDto;
import com.rateit.backend.entity.dto.TourneyStandingDto;
import com.rateit.backend.entity.dto.TourneyTeamDto;
import com.rateit.backend.entity.dto.TourneyTournamentDto;
import com.rateit.backend.entity.dto.TourneyTournamentPlayerDto;
import com.rateit.backend.entity.rest.AddTourneyTournamentPlayerRequest;
import com.rateit.backend.entity.rest.CommitTourneyRoundRequest;
import com.rateit.backend.entity.rest.EditTourneyTournamentRequest;
import com.rateit.backend.entity.rest.SaveTourneyPlayerRequest;
import com.rateit.backend.entity.rest.SaveTourneyTeamRequest;
import com.rateit.backend.entity.rest.SaveTourneyTournamentRequest;
import com.rateit.backend.entity.rest.UpdateTourneyMatchScoreRequest;
import com.rateit.backend.entity.types.Resource;
import com.rateit.backend.entity.types.TourneyTournamentFormat;
import com.rateit.backend.entity.types.TourneyTournamentMode;
import com.rateit.backend.entity.types.TourneyTournamentStatus;
import com.rateit.backend.exception.AuthorizationException;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.repository.TourneyMatchRepository;
import com.rateit.backend.repository.TourneyPlayerRepository;
import com.rateit.backend.repository.TourneyTeamRepository;
import com.rateit.backend.repository.TourneyTournamentPlayerRepository;
import com.rateit.backend.repository.TourneyTournamentRepository;
import com.rateit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TourneyService {

    private final TourneyTournamentRepository tournamentRepository;
    private final TourneyPlayerRepository playerRepository;
    private final TourneyTournamentPlayerRepository tournamentPlayerRepository;
    private final TourneyTeamRepository teamRepository;
    private final TourneyMatchRepository matchRepository;
    private final UserService userService;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<TourneyPlayerDto> listPlayers(String phoneNumber) {
        User owner = userService.findByPhoneNumber(phoneNumber);
        return playerRepository.findByOwnerUserOrderByDisplayNameAsc(owner)
            .stream()
            .map(TourneyPlayerDto::fromPlayer)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<TourneyCriticUserDto> listCriticUsers(String phoneNumber) {
        userService.findByPhoneNumber(phoneNumber); // auth check
        Set<Long> playedBefore = new HashSet<>(playerRepository.findCriticUserIdsWithTournamentHistory());
        return userRepository.findVisibleUsers(PageRequest.of(0, 500))
            .stream()
            .map(user -> new TourneyCriticUserDto(
                user.getId(),
                user.getUsername(),
                user.getProfilePicUrl(),
                playedBefore.contains(user.getId())
            ))
            // Players who have been in tournaments before float to the top, then
            // alphabetical by username.
            .sorted(Comparator.comparing(TourneyCriticUserDto::playedBefore).reversed()
                .thenComparing(dto -> dto.username() == null ? "" : dto.username().toLowerCase()))
            .toList();
    }

    @Transactional
    public TourneyPlayerDto createPlayer(SaveTourneyPlayerRequest request, String phoneNumber) {
        User owner = userService.findByPhoneNumber(phoneNumber);
        User criticUser = request.criticUserId() == null ? null : userService.findById(request.criticUserId());
        TourneyPlayer player = TourneyPlayer.builder()
            .ownerUser(owner)
            .criticUser(criticUser)
            .displayName(request.displayName().trim())
            .notes(trimToNull(request.notes()))
            .build();
        return TourneyPlayerDto.fromPlayer(playerRepository.save(player));
    }

    @Transactional(readOnly = true)
    public List<TourneyTournamentDto> listTournaments(String phoneNumber) {
        User owner = userService.findByPhoneNumber(phoneNumber);
        return tournamentRepository.findByOwnerUserOrderByTournamentDateDescCreatedAtDesc(owner)
            .stream()
            .map(tournament -> TourneyTournamentDto.summary(
                tournament,
                (int) tournamentPlayerRepository.countByTournament(tournament),
                (int) teamRepository.countByTournament(tournament),
                matchRepository.findByTournamentOrderByRoundNumberAscIdAsc(tournament).size()
            ))
            .toList();
    }

    @Transactional
    public TourneyTournamentDto createTournament(SaveTourneyTournamentRequest request, String phoneNumber) {
        User owner = userService.findByPhoneNumber(phoneNumber);
        TourneyTournament tournament = TourneyTournament.builder()
            .ownerUser(owner)
            .name(request.name().trim())
            .location(trimToNull(request.location()))
            .tournamentDate(request.tournamentDate())
            .status(request.status() == null ? TourneyTournamentStatus.DRAFT : request.status())
            .format(request.format() == null ? TourneyTournamentFormat.PARTNER_SWAP : request.format())
            .mode(request.mode() == null ? TourneyTournamentMode.LIVE : request.mode())
            .courtCount(request.courtCount() == null ? 1 : request.courtCount())
            .pointsToWin(request.pointsToWin() == null ? 21 : request.pointsToWin())
            .notes(trimToNull(request.notes()))
            .build();

        return getTournamentDetail(tournamentRepository.save(tournament).getId(), phoneNumber);
    }

    @Transactional
    public TourneyTournamentDto updateTournament(Long tournamentId, SaveTourneyTournamentRequest request, String phoneNumber) {
        TourneyTournament tournament = findOwnedTournament(tournamentId, phoneNumber);
        tournament.setName(request.name().trim());
        tournament.setLocation(trimToNull(request.location()));
        tournament.setTournamentDate(request.tournamentDate());
        tournament.setStatus(request.status() == null ? tournament.getStatus() : request.status());
        tournament.setFormat(request.format() == null ? tournament.getFormat() : request.format());
        tournament.setMode(request.mode() == null ? tournament.getMode() : request.mode());
        tournament.setCourtCount(request.courtCount() == null ? tournament.getCourtCount() : request.courtCount());
        tournament.setPointsToWin(request.pointsToWin() == null ? tournament.getPointsToWin() : request.pointsToWin());
        tournament.setNotes(trimToNull(request.notes()));
        return buildDetail(tournament);
    }

    @Transactional(readOnly = true)
    public TourneyTournamentDto getTournamentDetail(Long tournamentId, String phoneNumber) {
        return buildDetail(findOwnedTournament(tournamentId, phoneNumber));
    }

    @Transactional
    public TourneyTournamentDto addTournamentPlayer(Long tournamentId, AddTourneyTournamentPlayerRequest request, String phoneNumber) {
        TourneyTournament tournament = findOwnedTournament(tournamentId, phoneNumber);
        TourneyPlayer player = findOwnedPlayer(request.playerId(), phoneNumber);
        if (tournamentPlayerRepository.existsByTournamentAndPlayer(tournament, player)) {
            return buildDetail(tournament);
        }

        int nextSeed = (int) tournamentPlayerRepository.countByTournament(tournament) + 1;
        tournamentPlayerRepository.save(TourneyTournamentPlayer.builder()
            .tournament(tournament)
            .player(player)
            .seedNumber(request.seedNumber() == null ? nextSeed : request.seedNumber())
            .checkedIn(request.checkedIn() == null ? true : request.checkedIn())
            .build());
        return buildDetail(tournament);
    }

    @Transactional
    public TourneyTournamentDto deleteTournamentPlayer(Long tournamentId, Long playerId, String phoneNumber) {
        TourneyTournament tournament = findOwnedTournament(tournamentId, phoneNumber);
        TourneyPlayer player = findOwnedPlayer(playerId, phoneNumber);
        TourneyTournamentPlayer tournamentPlayer = tournamentPlayerRepository.findByTournamentAndPlayer(tournament, player)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.TOURNEY_TOURNAMENT_PLAYER, playerId));

        boolean playerHasMatch = matchRepository.findByTournamentOrderByRoundNumberAscIdAsc(tournament)
            .stream()
            .anyMatch(match -> teamHasPlayer(match.getTeamA(), playerId) || teamHasPlayer(match.getTeamB(), playerId));
        if (playerHasMatch) {
            throw AuthorizationException.forbidden("Delete the schedule before removing a player");
        }

        tournamentPlayerRepository.delete(tournamentPlayer);
        return buildDetail(tournament);
    }

    @Transactional
    public TourneyTournamentDto addTeam(Long tournamentId, SaveTourneyTeamRequest request, String phoneNumber) {
        TourneyTournament tournament = findOwnedTournament(tournamentId, phoneNumber);
        TourneyPlayer playerOne = findOwnedPlayer(request.playerOneId(), phoneNumber);
        TourneyPlayer playerTwo = findOwnedPlayer(request.playerTwoId(), phoneNumber);
        if (playerOne.getId().equals(playerTwo.getId())) {
            throw AuthorizationException.forbidden("A team needs two different players");
        }
        ensureTournamentPlayer(tournament, playerOne);
        ensureTournamentPlayer(tournament, playerTwo);
        getOrCreateTeam(tournament, playerOne, playerTwo);
        return buildDetail(tournament);
    }

    @Transactional
    public TourneyTournamentDto deleteTeam(Long tournamentId, Long teamId, String phoneNumber) {
        TourneyTournament tournament = findOwnedTournament(tournamentId, phoneNumber);
        TourneyTeam team = teamRepository.findById(teamId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.TOURNEY_TEAM, teamId));
        if (!team.getTournament().getId().equals(tournament.getId())) {
            throw ResourceNotFoundException.resource(Resource.TOURNEY_TEAM, teamId);
        }

        boolean hasMatch = matchRepository.findByTournamentOrderByRoundNumberAscIdAsc(tournament)
            .stream()
            .anyMatch(match -> match.getTeamA().getId().equals(teamId) || match.getTeamB().getId().equals(teamId));
        if (hasMatch) {
            throw AuthorizationException.forbidden("Delete the schedule before removing a team");
        }

        teamRepository.delete(team);
        return buildDetail(tournament);
    }

    @Transactional
    public TourneyTournamentDto generatePartnerSwapTeams(Long tournamentId, String phoneNumber) {
        TourneyTournament tournament = findOwnedTournament(tournamentId, phoneNumber);
        List<TourneyPlayer> players = tournamentPlayerRepository.findByTournamentOrderBySeedNumberAscCreatedAtAsc(tournament)
            .stream()
            .map(TourneyTournamentPlayer::getPlayer)
            .toList();

        for (int i = 0; i < players.size(); i++) {
            for (int j = i + 1; j < players.size(); j++) {
                getOrCreateTeam(tournament, players.get(i), players.get(j));
            }
        }
        return buildDetail(tournament);
    }

    @Transactional
    public TourneyTournamentDto generateRoundRobinSchedule(Long tournamentId, String phoneNumber) {
        TourneyTournament tournament = findOwnedTournament(tournamentId, phoneNumber);
        if (tournament.getFormat() == TourneyTournamentFormat.PARTNER_SWAP) {
            generatePartnerSwapTeams(tournamentId, phoneNumber);
        }

        List<TourneyTeam> teams = teamRepository.findByTournamentOrderByNameAsc(tournament);
        matchRepository.deleteByTournament(tournament);

        int matchNumber = 1;
        List<TourneyMatch> matches = new ArrayList<>();
        for (int i = 0; i < teams.size(); i++) {
            for (int j = i + 1; j < teams.size(); j++) {
                TourneyTeam teamA = teams.get(i);
                TourneyTeam teamB = teams.get(j);
                if (teamsSharePlayer(teamA, teamB)) {
                    continue;
                }
                matches.add(TourneyMatch.builder()
                    .tournament(tournament)
                    .teamA(teamA)
                    .teamB(teamB)
                    .roundNumber(matchNumber)
                    .roundName("Match " + matchNumber)
                    .build());
                matchNumber++;
            }
        }
        matchRepository.saveAll(matches);

        if (tournament.getStatus() == TourneyTournamentStatus.DRAFT && !matches.isEmpty()) {
            tournament.setStatus(TourneyTournamentStatus.ACTIVE);
        }

        return buildDetail(tournament);
    }

    @Transactional
    public TourneyTournamentDto updateMatchScore(
        Long tournamentId,
        Long matchId,
        UpdateTourneyMatchScoreRequest request,
        String phoneNumber
    ) {
        TourneyTournament tournament = findOwnedTournament(tournamentId, phoneNumber);
        TourneyMatch match = matchRepository.findById(matchId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.TOURNEY_MATCH, matchId));
        if (!match.getTournament().getId().equals(tournament.getId())) {
            throw ResourceNotFoundException.resource(Resource.TOURNEY_MATCH, matchId);
        }

        match.setTeamAScore(request.teamAScore());
        match.setTeamBScore(request.teamBScore());
        match.setCourt(trimToNull(request.court()));
        return buildDetail(tournament);
    }

    @Transactional
    public TourneyTournamentDto commitRound(Long tournamentId, CommitTourneyRoundRequest request, String phoneNumber) {
        TourneyTournament tournament = findOwnedTournament(tournamentId, phoneNumber);
        Map<Long, TourneyPlayer> byId = new LinkedHashMap<>();
        for (TourneyTournamentPlayer tp : tournamentPlayerRepository.findByTournamentOrderBySeedNumberAscCreatedAtAsc(tournament)) {
            byId.put(tp.getPlayer().getId(), tp.getPlayer());
        }

        int roundNumber = request.roundNumber();
        List<TourneyMatch> toSave = new ArrayList<>();
        int net = 1;
        for (CommitTourneyRoundRequest.RoundGame game : request.games()) {
            TourneyTeam teamA = getOrCreateTeam(tournament,
                requirePlayer(byId, game.teamAPlayerIds().get(0)),
                requirePlayer(byId, game.teamAPlayerIds().get(1)));
            TourneyTeam teamB = getOrCreateTeam(tournament,
                requirePlayer(byId, game.teamBPlayerIds().get(0)),
                requirePlayer(byId, game.teamBPlayerIds().get(1)));
            toSave.add(TourneyMatch.builder()
                .tournament(tournament)
                .teamA(teamA)
                .teamB(teamB)
                .roundNumber(roundNumber)
                .roundName("Round " + roundNumber)
                .court("Net " + net)
                .teamAScore(game.teamAScore())
                .teamBScore(game.teamBScore())
                .build());
            net++;
        }
        matchRepository.saveAll(toSave);

        if (tournament.getStatus() == TourneyTournamentStatus.DRAFT && !toSave.isEmpty()) {
            tournament.setStatus(TourneyTournamentStatus.ACTIVE);
        }
        return buildDetail(tournament);
    }

    // Full replace used by the edit-finished-tournament screen: update name/date,
    // reconcile the roster to exactly the given players, and rebuild every round's
    // games (teams + scores) from scratch.
    @Transactional
    public TourneyTournamentDto editTournament(Long tournamentId, EditTourneyTournamentRequest request, String phoneNumber) {
        TourneyTournament tournament = findOwnedTournament(tournamentId, phoneNumber);
        tournament.setName(request.name().trim());
        if (request.tournamentDate() != null) {
            tournament.setTournamentDate(request.tournamentDate());
        }

        // Clear the existing schedule first so roster changes don't collide with it.
        matchRepository.deleteByTournament(tournament);

        // Reconcile the roster to exactly request.playerIds().
        Set<Long> desired = new HashSet<>(request.playerIds());
        Set<Long> present = new HashSet<>();
        for (TourneyTournamentPlayer tp : tournamentPlayerRepository.findByTournamentOrderBySeedNumberAscCreatedAtAsc(tournament)) {
            if (desired.contains(tp.getPlayer().getId())) {
                present.add(tp.getPlayer().getId());
            } else {
                tournamentPlayerRepository.delete(tp);
            }
        }
        for (Long playerId : request.playerIds()) {
            if (!present.contains(playerId)) {
                ensureTournamentPlayer(tournament, findOwnedPlayer(playerId, phoneNumber));
            }
        }

        Map<Long, TourneyPlayer> byId = new LinkedHashMap<>();
        for (TourneyTournamentPlayer tp : tournamentPlayerRepository.findByTournamentOrderBySeedNumberAscCreatedAtAsc(tournament)) {
            byId.put(tp.getPlayer().getId(), tp.getPlayer());
        }

        List<TourneyMatch> toSave = new ArrayList<>();
        for (EditTourneyTournamentRequest.EditRound round : request.rounds()) {
            int net = 1;
            for (CommitTourneyRoundRequest.RoundGame game : round.games()) {
                TourneyTeam teamA = getOrCreateTeam(tournament,
                    requirePlayer(byId, game.teamAPlayerIds().get(0)),
                    requirePlayer(byId, game.teamAPlayerIds().get(1)));
                TourneyTeam teamB = getOrCreateTeam(tournament,
                    requirePlayer(byId, game.teamBPlayerIds().get(0)),
                    requirePlayer(byId, game.teamBPlayerIds().get(1)));
                toSave.add(TourneyMatch.builder()
                    .tournament(tournament)
                    .teamA(teamA)
                    .teamB(teamB)
                    .roundNumber(round.roundNumber())
                    .roundName("Round " + round.roundNumber())
                    .court("Net " + net)
                    .teamAScore(game.teamAScore())
                    .teamBScore(game.teamBScore())
                    .build());
                net++;
            }
        }
        matchRepository.saveAll(toSave);
        return buildDetail(tournament);
    }

    @Transactional
    public void deleteTournament(Long tournamentId, String phoneNumber) {
        TourneyTournament tournament = findOwnedTournament(tournamentId, phoneNumber);
        matchRepository.deleteByTournament(tournament);
        teamRepository.deleteAll(teamRepository.findByTournamentOrderByNameAsc(tournament));
        tournamentPlayerRepository.deleteAll(
            tournamentPlayerRepository.findByTournamentOrderBySeedNumberAscCreatedAtAsc(tournament));
        tournamentRepository.delete(tournament);
    }

    @Transactional
    public TourneyTournamentDto deleteMatch(Long tournamentId, Long matchId, String phoneNumber) {
        TourneyTournament tournament = findOwnedTournament(tournamentId, phoneNumber);
        TourneyMatch match = matchRepository.findById(matchId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.TOURNEY_MATCH, matchId));
        if (!match.getTournament().getId().equals(tournament.getId())) {
            throw ResourceNotFoundException.resource(Resource.TOURNEY_MATCH, matchId);
        }
        matchRepository.delete(match);
        return buildDetail(tournament);
    }

    private TourneyPlayer requirePlayer(Map<Long, TourneyPlayer> byId, Long playerId) {
        TourneyPlayer player = byId.get(playerId);
        if (player == null) {
            throw ResourceNotFoundException.resource(Resource.TOURNEY_PLAYER, playerId);
        }
        return player;
    }

    private TourneyTournament findOwnedTournament(Long tournamentId, String phoneNumber) {
        TourneyTournament tournament = tournamentRepository.findById(tournamentId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.TOURNEY_TOURNAMENT, tournamentId));
        User owner = userService.findByPhoneNumber(phoneNumber);
        if (!tournament.getOwnerUser().getId().equals(owner.getId())) {
            throw ResourceNotFoundException.resource(Resource.TOURNEY_TOURNAMENT, tournamentId);
        }
        return tournament;
    }

    private TourneyPlayer findOwnedPlayer(Long playerId, String phoneNumber) {
        TourneyPlayer player = playerRepository.findById(playerId)
            .orElseThrow(() -> ResourceNotFoundException.resource(Resource.TOURNEY_PLAYER, playerId));
        User owner = userService.findByPhoneNumber(phoneNumber);
        if (!player.getOwnerUser().getId().equals(owner.getId())) {
            throw ResourceNotFoundException.resource(Resource.TOURNEY_PLAYER, playerId);
        }
        return player;
    }

    private void ensureTournamentPlayer(TourneyTournament tournament, TourneyPlayer player) {
        if (tournamentPlayerRepository.existsByTournamentAndPlayer(tournament, player)) {
            return;
        }
        int nextSeed = (int) tournamentPlayerRepository.countByTournament(tournament) + 1;
        tournamentPlayerRepository.save(TourneyTournamentPlayer.builder()
            .tournament(tournament)
            .player(player)
            .seedNumber(nextSeed)
            .checkedIn(true)
            .build());
    }

    private TourneyTeam getOrCreateTeam(TourneyTournament tournament, TourneyPlayer playerOne, TourneyPlayer playerTwo) {
        Long lowId = Math.min(playerOne.getId(), playerTwo.getId());
        Long highId = Math.max(playerOne.getId(), playerTwo.getId());
        return teamRepository.findByTournamentAndPlayerLowIdAndPlayerHighId(tournament, lowId, highId)
            .orElseGet(() -> teamRepository.save(TourneyTeam.builder()
                .tournament(tournament)
                .name(playerOne.getDisplayName() + " / " + playerTwo.getDisplayName())
                .playerOne(playerOne)
                .playerTwo(playerTwo)
                .playerLowId(lowId)
                .playerHighId(highId)
                .build()));
    }

    private TourneyTournamentDto buildDetail(TourneyTournament tournament) {
        List<TourneyTournamentPlayer> tournamentPlayers = tournamentPlayerRepository.findByTournamentOrderBySeedNumberAscCreatedAtAsc(tournament);
        List<TourneyTeam> teams = teamRepository.findByTournamentOrderByNameAsc(tournament);
        List<TourneyMatch> matches = matchRepository.findByTournamentOrderByRoundNumberAscIdAsc(tournament);
        List<TourneyTournamentPlayerDto> playerDtos = tournamentPlayers.stream().map(TourneyTournamentPlayerDto::fromTournamentPlayer).toList();
        List<TourneyTeamDto> teamDtos = teams.stream().map(TourneyTeamDto::fromTeam).toList();
        List<TourneyMatchDto> matchDtos = matches.stream().map(TourneyMatchDto::fromMatch).toList();
        return TourneyTournamentDto.detail(
            tournament,
            tournamentPlayers.size(),
            teams.size(),
            matches.size(),
            playerDtos,
            teamDtos,
            matchDtos,
            buildTeamStandings(teams, matches),
            buildPlayerStandings(tournamentPlayers, matches)
        );
    }

    private List<TourneyStandingDto> buildTeamStandings(List<TourneyTeam> teams, List<TourneyMatch> matches) {
        Map<Long, MutableStanding> standings = new LinkedHashMap<>();
        teams.forEach(team -> standings.put(team.getId(), new MutableStanding(team.getId(), team.getName())));

        for (TourneyMatch match : matches) {
            if (match.getTeamAScore() == null || match.getTeamBScore() == null) continue;
            MutableStanding teamA = standings.get(match.getTeamA().getId());
            MutableStanding teamB = standings.get(match.getTeamB().getId());
            if (teamA == null || teamB == null) continue;
            applyResult(teamA, teamB, match.getTeamAScore(), match.getTeamBScore());
        }

        return standings.values().stream()
            .sorted(STANDING_COMPARATOR)
            .map(MutableStanding::toTeamDto)
            .toList();
    }

    private List<TourneyPlayerStandingDto> buildPlayerStandings(List<TourneyTournamentPlayer> tournamentPlayers, List<TourneyMatch> matches) {
        Map<Long, MutableStanding> standings = new LinkedHashMap<>();
        tournamentPlayers.forEach(tp -> standings.put(
            tp.getPlayer().getId(),
            new MutableStanding(tp.getPlayer().getId(), tp.getPlayer().getDisplayName())
        ));

        for (TourneyMatch match : matches) {
            if (match.getTeamAScore() == null || match.getTeamBScore() == null) continue;
            for (TourneyPlayer player : List.of(match.getTeamA().getPlayerOne(), match.getTeamA().getPlayerTwo())) {
                MutableStanding standing = standings.get(player.getId());
                if (standing != null) {
                    applySingleResult(standing, match.getTeamAScore(), match.getTeamBScore());
                }
            }
            for (TourneyPlayer player : List.of(match.getTeamB().getPlayerOne(), match.getTeamB().getPlayerTwo())) {
                MutableStanding standing = standings.get(player.getId());
                if (standing != null) {
                    applySingleResult(standing, match.getTeamBScore(), match.getTeamAScore());
                }
            }
        }

        return standings.values().stream()
            .sorted(STANDING_COMPARATOR)
            .map(MutableStanding::toPlayerDto)
            .toList();
    }

    private static final Comparator<MutableStanding> STANDING_COMPARATOR = Comparator
        .comparingInt(MutableStanding::wins).reversed()
        .thenComparing(Comparator.comparingInt(MutableStanding::pointDifferential).reversed())
        .thenComparing(Comparator.comparingInt(MutableStanding::pointsFor).reversed())
        .thenComparing(MutableStanding::name);

    private void applyResult(MutableStanding teamA, MutableStanding teamB, int teamAScore, int teamBScore) {
        applySingleResult(teamA, teamAScore, teamBScore);
        applySingleResult(teamB, teamBScore, teamAScore);
    }

    private void applySingleResult(MutableStanding standing, int pointsFor, int pointsAgainst) {
        standing.played++;
        standing.pointsFor += pointsFor;
        standing.pointsAgainst += pointsAgainst;
        if (pointsFor > pointsAgainst) {
            standing.wins++;
        } else if (pointsAgainst > pointsFor) {
            standing.losses++;
        }
    }

    private boolean teamsSharePlayer(TourneyTeam teamA, TourneyTeam teamB) {
        return teamHasPlayer(teamA, teamB.getPlayerOne().getId())
            || teamHasPlayer(teamA, teamB.getPlayerTwo().getId());
    }

    private boolean teamHasPlayer(TourneyTeam team, Long playerId) {
        return team.getPlayerOne().getId().equals(playerId) || team.getPlayerTwo().getId().equals(playerId);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static class MutableStanding {
        private final Long id;
        private final String name;
        private int played;
        private int wins;
        private int losses;
        private int pointsFor;
        private int pointsAgainst;

        MutableStanding(Long id, String name) {
            this.id = id;
            this.name = name;
        }

        int wins() {
            return wins;
        }

        String name() {
            return name;
        }

        int pointsFor() {
            return pointsFor;
        }

        int pointDifferential() {
            return pointsFor - pointsAgainst;
        }

        TourneyStandingDto toTeamDto() {
            return new TourneyStandingDto(id, name, played, wins, losses, pointsFor, pointsAgainst, pointDifferential());
        }

        TourneyPlayerStandingDto toPlayerDto() {
            return new TourneyPlayerStandingDto(id, name, played, wins, losses, pointsFor, pointsAgainst, pointDifferential());
        }
    }
}
