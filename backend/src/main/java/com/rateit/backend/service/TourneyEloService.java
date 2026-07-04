package com.rateit.backend.service;

import com.rateit.backend.entity.TourneyEloEvent;
import com.rateit.backend.entity.TourneyMatch;
import com.rateit.backend.entity.TourneyPlayer;
import com.rateit.backend.entity.TourneyPlayerRating;
import com.rateit.backend.entity.TourneyTournamentPlayer;
import com.rateit.backend.entity.TourneyTeam;
import com.rateit.backend.entity.TourneyTournament;
import com.rateit.backend.entity.User;
import com.rateit.backend.entity.dto.TourneyLeaderboardRowDto;
import com.rateit.backend.entity.dto.TourneyEloPointDto;
import com.rateit.backend.entity.types.TourneyEloEventType;
import com.rateit.backend.entity.types.TourneyTournamentMode;
import com.rateit.backend.repository.TourneyEloEventRepository;
import com.rateit.backend.repository.TourneyMatchRepository;
import com.rateit.backend.repository.TourneyPlayerRatingRepository;
import com.rateit.backend.repository.TourneyTournamentPlayerRepository;
import com.rateit.backend.repository.TourneyTournamentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TourneyEloService {

    public static final String RATING_SYSTEM = "partner_swap_elo_v1";

    private static final double STARTING_RATING = 1000.0;
    private static final double K_FACTOR = 32.0;
    private static final double MARGIN_CAP = 0.5;

    private final TourneyTournamentRepository tournamentRepository;
    private final TourneyMatchRepository matchRepository;
    private final TourneyTournamentPlayerRepository tournamentPlayerRepository;
    private final TourneyPlayerRatingRepository playerRatingRepository;
    private final TourneyEloEventRepository eloEventRepository;
    private final UserService userService;

    @Transactional(propagation = Propagation.MANDATORY)
    public void regenerateAll() {
        eloEventRepository.deleteByRatingSystem(RATING_SYSTEM);
        eloEventRepository.flush();
        playerRatingRepository.deleteByRatingSystem(RATING_SYSTEM);
        playerRatingRepository.flush();
        // Without the flushes above, Hibernate's default action-queue ordering
        // executes pending inserts before pending deletes, so the fresh rows
        // saved below would violate the (player, rating_system) unique
        // constraint against the not-yet-executed deletes of the old rows.

        Map<Long, MutableRating> ratings = new LinkedHashMap<>();
        List<TourneyEloEvent> events = new ArrayList<>();
        long eventOrder = 1L;

        for (TourneyTournament tournament : tournamentRepository.findAllByOrderByTournamentDateAscCreatedAtAscIdAsc()) {
            List<TourneyMatch> matches = matchRepository.findByTournamentOrderByRoundNumberAscIdAsc(tournament);
            for (TourneyMatch match : matches) {
                if (match.getTeamAScore() == null || match.getTeamBScore() == null) {
                    continue;
                }
                if (match.getTeamAScore().equals(match.getTeamBScore())) {
                    continue;
                }
                eventOrder = applyMatch(tournament, match, ratings, events, eventOrder);
            }
        }

        eloEventRepository.saveAll(events);
        playerRatingRepository.saveAll(ratings.values().stream()
            .map(MutableRating::toEntity)
            .toList());
    }

    // Per-player Elo change within a single tournament: (rating after their last
    // event in it) - (rating before their first event in it). For a tournament
    // that isn't finished yet, this reflects the change from just the rounds
    // committed so far, since events are regenerated after every write.
    @Transactional
    public Map<Long, BigDecimal> getEloDeltasForTournament(Long tournamentId) {
        if (eloEventRepository.countByRatingSystem(RATING_SYSTEM) == 0) {
            regenerateAll();
        }

        Map<Long, BigDecimal[]> beforeAfterByPlayerId = new LinkedHashMap<>();
        for (TourneyEloEvent event : eloEventRepository.findByTournamentIdAndRatingSystemOrderByEventOrderAscIdAsc(tournamentId, RATING_SYSTEM)) {
            Long playerId = event.getPlayer().getId();
            BigDecimal[] beforeAfter = beforeAfterByPlayerId.computeIfAbsent(
                playerId,
                ignored -> new BigDecimal[]{event.getRatingBefore(), event.getRatingAfter()}
            );
            beforeAfter[1] = event.getRatingAfter();
        }

        Map<Long, BigDecimal> deltas = new LinkedHashMap<>();
        beforeAfterByPlayerId.forEach((playerId, beforeAfter) -> deltas.put(playerId, beforeAfter[1].subtract(beforeAfter[0])));
        return deltas;
    }

    @Transactional
    public List<TourneyEloPointDto> getMyEloHistory(String phoneNumber) {
        if (eloEventRepository.countByRatingSystem(RATING_SYSTEM) == 0) {
            regenerateAll();
        }

        User user = userService.findByPhoneNumber(phoneNumber);
        Map<Long, TourneyEloPointDto> byTournament = new LinkedHashMap<>();

        eloEventRepository.findAll().stream()
            .filter(event -> RATING_SYSTEM.equals(event.getRatingSystem()))
            .filter(event -> event.getPlayer().getCriticUser() != null && event.getPlayer().getCriticUser().getId().equals(user.getId()))
            .sorted((left, right) -> {
                int order = Long.compare(
                    left.getEventOrder() == null ? Long.MAX_VALUE : left.getEventOrder(),
                    right.getEventOrder() == null ? Long.MAX_VALUE : right.getEventOrder()
                );
                if (order != 0) return order;
                return Long.compare(left.getId() == null ? Long.MAX_VALUE : left.getId(), right.getId() == null ? Long.MAX_VALUE : right.getId());
            })
            .forEach(event -> {
                TourneyTournament tournament = event.getTournament() != null
                    ? event.getTournament()
                    : event.getMatch() == null ? null : event.getMatch().getTournament();
                if (tournament == null) {
                    return;
                }
                byTournament.put(tournament.getId(), new TourneyEloPointDto(
                    tournament.getId(),
                    tournament.getName(),
                    tournament.getTournamentDate(),
                    event.getRatingAfter()
                ));
            });

        return new ArrayList<>(byTournament.values());
    }

    @Transactional
    public List<TourneyLeaderboardRowDto> getLeaderboard() {
        if (eloEventRepository.countByRatingSystem(RATING_SYSTEM) == 0) {
            regenerateAll();
        }

        Map<Long, MutableLeaderboardRow> rowsByPlayerId = new LinkedHashMap<>();

        for (TourneyTournament tournament : tournamentRepository.findAllByOrderByTournamentDateAscCreatedAtAscIdAsc()) {
            // Matches move Elo (via regenerateAll above) but are not tournaments, so
            // they don't count toward tournaments-played, placement, or wins here.
            if (tournament.getMode() == TourneyTournamentMode.MATCH) {
                continue;
            }
            List<TourneyTournamentPlayer> tournamentPlayers = tournamentPlayerRepository.findByTournamentOrderBySeedNumberAscCreatedAtAsc(tournament);
            if (tournamentPlayers.isEmpty()) {
                continue;
            }

            List<TourneyMatch> matches = matchRepository.findByTournamentOrderByRoundNumberAscIdAsc(tournament);
            Map<Long, MutableStanding> standings = buildPlayerStandings(tournamentPlayers, matches);
            int placement = 1;
            for (MutableStanding standing : standings.values().stream().sorted(PLAYER_STANDING_COMPARATOR).toList()) {
                MutableLeaderboardRow row = rowsByPlayerId.computeIfAbsent(standing.id, ignored -> new MutableLeaderboardRow(standing.id, standing.name, standing.profilePicUrl));
                row.tournamentsPlayed++;
                row.totalPlacement += placement++;
                row.wins += standing.wins();
            }
        }

        Map<Long, BigDecimal> ratingsByPlayerId = new LinkedHashMap<>();
        playerRatingRepository.findAllByRatingSystemOrderByRatingDescIdAsc(RATING_SYSTEM)
            .forEach(rating -> ratingsByPlayerId.put(rating.getPlayer().getId(), rating.getRating()));

        List<MutableLeaderboardRow> sortedRows = rowsByPlayerId.values().stream()
            .sorted(Comparator
                .comparing((MutableLeaderboardRow row) -> ratingsByPlayerId.getOrDefault(row.playerId, decimal(STARTING_RATING)))
                .reversed()
                .thenComparing(row -> row.playerName == null ? "" : row.playerName.toLowerCase())
                .thenComparing(row -> row.playerId))
            .toList();

        List<TourneyLeaderboardRowDto> rows = new ArrayList<>(sortedRows.size());
        int rank = 1;
        for (MutableLeaderboardRow row : sortedRows) {
            BigDecimal elo = ratingsByPlayerId.getOrDefault(row.playerId, decimal(STARTING_RATING));
            Double averagePlacement = row.tournamentsPlayed == 0
                ? null
                : (double) row.totalPlacement / (double) row.tournamentsPlayed;
            rows.add(new TourneyLeaderboardRowDto(
                rank++,
                row.playerId,
                row.playerName,
                row.profilePicUrl,
                elo,
                averagePlacement,
                row.wins
            ));
        }

        return rows;
    }

    private long applyMatch(
        TourneyTournament tournament,
        TourneyMatch match,
        Map<Long, MutableRating> ratings,
        List<TourneyEloEvent> events,
        long eventOrder
    ) {
        TourneyTeam teamA = match.getTeamA();
        TourneyTeam teamB = match.getTeamB();
        MutableRating aOne = ratingFor(ratings, teamA.getPlayerOne());
        MutableRating aTwo = ratingFor(ratings, teamA.getPlayerTwo());
        MutableRating bOne = ratingFor(ratings, teamB.getPlayerOne());
        MutableRating bTwo = ratingFor(ratings, teamB.getPlayerTwo());

        double teamARating = (aOne.rating + aTwo.rating) / 2.0;
        double teamBRating = (bOne.rating + bTwo.rating) / 2.0;
        double expectedA = expectedScore(teamARating, teamBRating);
        double actualA = match.getTeamAScore() > match.getTeamBScore() ? 1.0 : 0.0;
        double multiplier = marginMultiplier(match.getTeamAScore(), match.getTeamBScore());
        double deltaA = K_FACTOR * multiplier * (actualA - expectedA);
        double deltaB = -deltaA;

        for (MutableRating rating : List.of(aOne, aTwo)) {
            events.add(updateRating(tournament, match, rating, deltaA, eventOrder));
        }
        for (MutableRating rating : List.of(bOne, bTwo)) {
            events.add(updateRating(tournament, match, rating, deltaB, eventOrder));
        }
        return eventOrder + 1;
    }

    private MutableRating ratingFor(Map<Long, MutableRating> ratings, TourneyPlayer player) {
        return ratings.computeIfAbsent(player.getId(), ignored -> new MutableRating(player));
    }

    private Map<Long, MutableStanding> buildPlayerStandings(List<TourneyTournamentPlayer> tournamentPlayers, List<TourneyMatch> matches) {
        Map<Long, MutableStanding> standings = new LinkedHashMap<>();
        tournamentPlayers.forEach(tp -> standings.put(
            tp.getPlayer().getId(),
            new MutableStanding(tp.getPlayer().getId(), tp.getPlayer().getDisplayName(), profilePicOf(tp.getPlayer()))
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

        return standings;
    }

    private TourneyEloEvent updateRating(
        TourneyTournament tournament,
        TourneyMatch match,
        MutableRating rating,
        double delta,
        long eventOrder
    ) {
        double before = rating.rating;
        rating.rating += delta;
        rating.matchesPlayed++;
        rating.lastRatedAt = match.getCreatedAt();
        return TourneyEloEvent.builder()
            .player(rating.player)
            .match(match)
            .tournament(tournament)
            .eventType(TourneyEloEventType.MATCH_RESULT)
            .ratingSystem(RATING_SYSTEM)
            .eventOrder(eventOrder)
            .ratingBefore(decimal(before))
            .ratingAfter(decimal(rating.rating))
            .ratingDelta(decimal(delta))
            .build();
    }

    private double expectedScore(double teamRating, double opponentRating) {
        return 1.0 / (1.0 + Math.pow(10.0, (opponentRating - teamRating) / 400.0));
    }

    private String profilePicOf(TourneyPlayer player) {
        return player.getCriticUser() == null ? null : player.getCriticUser().getProfilePicUrl();
    }

    private double marginMultiplier(int teamAScore, int teamBScore) {
        int highScore = Math.max(Math.max(teamAScore, teamBScore), 1);
        double marginRatio = (double) Math.abs(teamAScore - teamBScore) / highScore;
        return 1.0 + Math.min(MARGIN_CAP, marginRatio * MARGIN_CAP);
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

    private BigDecimal decimal(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    private static final Comparator<MutableStanding> PLAYER_STANDING_COMPARATOR = Comparator
        .comparingInt(MutableStanding::wins).reversed()
        .thenComparing(Comparator.comparingInt(MutableStanding::pointDifferential).reversed())
        .thenComparing(Comparator.comparingInt(MutableStanding::pointsFor).reversed())
        .thenComparing(MutableStanding::name);

    private class MutableRating {
        private final TourneyPlayer player;
        private double rating = STARTING_RATING;
        private int matchesPlayed = 0;
        private java.time.Instant lastRatedAt;

        MutableRating(TourneyPlayer player) {
            this.player = player;
        }

        TourneyPlayerRating toEntity() {
            return TourneyPlayerRating.builder()
                .player(player)
                .ratingSystem(RATING_SYSTEM)
                .rating(decimal(rating))
                .matchesPlayed(matchesPlayed)
                .lastRatedAt(lastRatedAt)
                .build();
        }
    }

    private static class MutableStanding {
        private final Long id;
        private final String name;
        private final String profilePicUrl;
        private int played;
        private int wins;
        private int losses;
        private int pointsFor;
        private int pointsAgainst;

        MutableStanding(Long id, String name, String profilePicUrl) {
            this.id = id;
            this.name = name;
            this.profilePicUrl = profilePicUrl;
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
    }

    private static class MutableLeaderboardRow {
        private final Long playerId;
        private final String playerName;
        private final String profilePicUrl;
        private int tournamentsPlayed;
        private int totalPlacement;
        private int wins;

        MutableLeaderboardRow(Long playerId, String playerName, String profilePicUrl) {
            this.playerId = playerId;
            this.profilePicUrl = profilePicUrl;
            this.playerName = playerName;
        }
    }
}
