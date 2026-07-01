import { Fragment, useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Screen from '../components/Screen.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { colors, radius, spacing, text } from '../theme.js';

const sameId = (left, right) => left != null && right != null && String(left) === String(right);

const byRecentMatch = (left, right) => (
  String(right.tournamentDate || '').localeCompare(String(left.tournamentDate || ''))
  || String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
  || (Number(right.roundNumber || 0) - Number(left.roundNumber || 0))
  || (Number(right.id || 0) - Number(left.id || 0))
);

const detailPlayerForUser = (detail, userId) => (
  (detail.players || []).find((entry) => sameId(entry.player?.criticUserId, userId))?.player || null
);

const playerStanding = (detail, playerId) => (
  (detail.playerStandings || []).find((standing) => sameId(standing.playerId, playerId)) || null
);

const placementForPlayer = (detail, playerId) => {
  const index = (detail.playerStandings || []).findIndex((standing) => sameId(standing.playerId, playerId));
  return index < 0 ? null : index + 1;
};

const teamHasPlayer = (team, playerId) => (
  sameId(team?.playerOne?.id, playerId) || sameId(team?.playerTwo?.id, playerId)
);

const partnerFromTeam = (team, playerId) => {
  if (!team) return null;
  if (sameId(team.playerOne?.id, playerId)) return team.playerTwo;
  if (sameId(team.playerTwo?.id, playerId)) return team.playerOne;
  return null;
};

const buildPartnerStreaks = (details, userId) => {
  const eventsByPartner = new Map();

  details.forEach((detail) => {
    const player = detailPlayerForUser(detail, userId);
    if (!player) return;

    const teamsById = new Map((detail.teams || []).map((team) => [String(team.id), team]));
    (detail.matches || [])
      .filter((match) => match.completed && match.teamAScore != null && match.teamBScore != null)
      .forEach((match) => {
        const teamA = teamsById.get(String(match.teamAId));
        const teamB = teamsById.get(String(match.teamBId));
        const side = teamHasPlayer(teamA, player.id) ? 'A' : teamHasPlayer(teamB, player.id) ? 'B' : null;
        if (!side) return;

        const team = side === 'A' ? teamA : teamB;
        const partner = partnerFromTeam(team, player.id);
        if (!partner) return;

        const won = side === 'A' ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore;
        const key = String(partner.id);
        const current = eventsByPartner.get(key) || { partner, events: [] };
        current.events.push({
          ...match,
          tournamentDate: detail.tournamentDate,
          createdAt: detail.createdAt,
          won
        });
        eventsByPartner.set(key, current);
      });
  });

  return [...eventsByPartner.values()]
    .map(({ partner, events }) => {
      const sorted = [...events].sort(byRecentMatch);
      let streak = 0;
      for (const event of sorted) {
        if (!event.won) break;
        streak += 1;
      }
      return { partner, streak };
    })
    .filter((item) => item.streak > 0)
    .sort((left, right) => (
      right.streak - left.streak
      || left.partner.displayName.localeCompare(right.partner.displayName)
    ));
};

const buildMetrics = (details, userId) => {
  const played = details
    .map((detail) => {
      const player = detailPlayerForUser(detail, userId);
      const standing = player ? playerStanding(detail, player.id) : null;
      return player && standing && standing.played > 0 ? { detail, player, standing } : null;
    })
    .filter(Boolean);

  const placements = played
    .map(({ detail, player }) => placementForPlayer(detail, player.id))
    .filter((placement) => placement != null);

  return {
    tournamentsPlayed: played.length,
    totalPoints: played.reduce((sum, item) => sum + Number(item.standing.pointsFor || 0), 0),
    gamesWon: played.reduce((sum, item) => sum + Number(item.standing.wins || 0), 0),
    tournamentsWon: played.filter(({ detail, player }) => placementForPlayer(detail, player.id) === 1).length,
    averagePlacement: placements.length ? placements.reduce((sum, placement) => sum + placement, 0) / placements.length : null,
    partnerStreaks: buildPartnerStreaks(details, userId)
  };
};

const MetricCard = ({ label, value, helper, labelFirst = false, centered = false }) => (
  <Card style={[styles.metricCard, labelFirst && styles.metricCardLabelFirst, centered && styles.metricCardCentered]}>
    {labelFirst ? <Text style={[styles.metricLabel, centered && styles.metricTextCentered]}>{label}</Text> : null}
    <View style={labelFirst ? styles.metricValueSlot : null}>
      <Text
        style={[styles.metricValue, centered && styles.metricTextCentered]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {value}
      </Text>
      {helper ? <Text style={[styles.metricHelper, centered && styles.metricTextCentered]}>{helper}</Text> : null}
    </View>
    {!labelFirst ? <Text style={[styles.metricLabel, centered && styles.metricTextCentered]}>{label}</Text> : null}
  </Card>
);

const formatEloDateLabel = (dateValue) => {
  if (!dateValue) return '';
  const [year, month, day] = String(dateValue).split('-');
  if (!year || !month || !day) return String(dateValue);
  return `${Number(month)}/${Number(day)}/${String(year).slice(-2)}`;
};

const EloGraph = ({ points }) => {
  const chartPoints = [
    { id: 'start', rating: 1000, label: 'Start' },
    ...points.map((point, index) => ({
      id: point.tournamentId ?? `tournament-${index}`,
      rating: Number(point.rating),
      label: formatEloDateLabel(point.tournamentDate)
    }))
  ].filter((point) => Number.isFinite(Number(point.rating)));
  const width = 360;
  const height = 250;
  const padX = 32;
  const padTop = 44;
  const padBottom = 50;
  const axisY = height - padBottom;
  const ratings = chartPoints.map((point) => Number(point.rating)).filter(Number.isFinite);
  const minRating = ratings.length ? Math.min(...ratings, 1000) : 980;
  const maxRating = ratings.length ? Math.max(...ratings, 1000) : 1020;
  const range = Math.max(20, maxRating - minRating);
  const yMin = minRating - Math.max(10, range * 0.15);
  const yMax = maxRating + Math.max(10, range * 0.15);
  const xFor = (index) => chartPoints.length <= 1
    ? width / 2
    : padX + (index * (width - padX * 2)) / (chartPoints.length - 1);
  const yFor = (rating) => axisY - ((Number(rating) - yMin) * (axisY - padTop)) / (yMax - yMin);
  const polyline = chartPoints.map((point, index) => `${xFor(index)},${yFor(point.rating)}`).join(' ');

  return (
    <View style={styles.chartWrap}>
      <Svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        <Line x1={padX} y1={padTop} x2={padX} y2={axisY} stroke={colors.borderStrong} strokeWidth="1.5" />
        <Line x1={padX} y1={axisY} x2={width - padX} y2={axisY} stroke={colors.borderStrong} strokeWidth="1.5" />
        <Line x1={padX} y1={yFor(1000)} x2={width - padX} y2={yFor(1000)} stroke={colors.border} strokeWidth="1.5" />
        {chartPoints.length > 1 ? (
          <Polyline points={polyline} fill="none" stroke={colors.accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {chartPoints.map((point, index) => {
          const x = xFor(index);
          const y = yFor(point.rating);
          const ratingLabelY = y < padTop + 22 ? y + 32 : y - 15;
          return (
            <Fragment key={`${point.id}-${index}`}>
              <SvgText
                x={x}
                y={ratingLabelY}
                fill={colors.text}
                fontSize="18"
                fontWeight="900"
                textAnchor="middle"
              >
                {Math.round(Number(point.rating))}
              </SvgText>
              <Circle cx={x} cy={y} r="8.5" fill={colors.accent} stroke={colors.text} strokeWidth="2" />
              <SvgText
                x={x}
                y={height - 18}
                fill={colors.textSubtle}
                fontSize="16"
                fontWeight="800"
                textAnchor="middle"
              >
                {point.label}
              </SvgText>
            </Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

const TourneyDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const currentUserId = user?.userId ?? user?.id;
  const [details, setDetails] = useState([]);
  const [eloHistory, setEloHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const [tournaments, nextEloHistory] = await Promise.all([
        BackendApiService.getTourneyTournaments(),
        BackendApiService.getMyTourneyEloHistory()
      ]);
      const nextDetails = await Promise.all(
        (tournaments || []).map((tournament) => BackendApiService.getTourneyTournament(tournament.id))
      );
      setDetails(nextDetails);
      setEloHistory(nextEloHistory || []);
    } catch (err) {
      notify({ message: err.message || 'Failed to load tourney dashboard', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentUserId, notify]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const metrics = useMemo(() => buildMetrics(details, currentUserId), [details, currentUserId]);

  const averagePlacement = metrics.averagePlacement == null
    ? '—'
    : metrics.averagePlacement.toFixed(metrics.averagePlacement % 1 === 0 ? 0 : 1);
  const currentElo = Math.round(Number(eloHistory[eloHistory.length - 1]?.rating ?? 1000));

  if (loading && details.length === 0) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Tourney</Text>
          <Text style={styles.title}>Dashboard</Text>
        </View>
        <AppButton
          label="Tournaments"
          variant="secondary"
          onPress={() => navigation.navigate('Tourney')}
          style={styles.headerButton}
          textStyle={styles.headerButtonText}
        />
      </View>

      <View style={styles.metricsTop}>
        <MetricCard label={`Tournament${metrics.tournamentsPlayed === 1 ? '' : 's'} played`} value={metrics.tournamentsPlayed} labelFirst centered />
        <MetricCard label="Total points scored" value={metrics.totalPoints} labelFirst centered />
        <MetricCard label="Total games won" value={metrics.gamesWon} labelFirst centered />
      </View>

      <View style={styles.middleGrid}>
        <Card style={styles.streakCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Partner win-streaks</Text>
          </View>
          {metrics.partnerStreaks.length === 0 ? (
            <Text style={styles.muted}>Win your latest game with a partner and they will show up here.</Text>
          ) : (
            <ScrollView style={styles.streakList} nestedScrollEnabled showsVerticalScrollIndicator>
              {metrics.partnerStreaks.map(({ partner, streak }) => (
                <View key={partner.id} style={styles.streakRow}>
                  <Text style={styles.partnerName} numberOfLines={1}>{partner.displayName}</Text>
                  <Text style={styles.streakCount}>{streak}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </Card>

        <View style={styles.sideStats}>
          <MetricCard label="Tournaments won" value={metrics.tournamentsWon} labelFirst centered />
          <MetricCard label="Average placement" value={averagePlacement} helper={metrics.averagePlacement == null ? 'No placements yet' : null} labelFirst centered />
        </View>
      </View>

      <Card style={styles.eloCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>ELO {Number.isFinite(currentElo) ? currentElo : 1000}</Text>
          <Text style={styles.cardSub}>{eloHistory.length ? `${eloHistory.length} tournament${eloHistory.length === 1 ? '' : 's'}` : '1000 start'}</Text>
        </View>
        <View style={styles.chartPlaceholder}>
          <EloGraph points={eloHistory} />
        </View>
      </Card>

      {details.length === 0 ? (
        <EmptyState title="No tournaments yet." message="Your tourney metrics will fill in after you play." />
      ) : null}

    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  header: { gap: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  eyebrow: { ...text.muted, color: colors.textSubtle, textTransform: 'uppercase', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  title: text.h1,
  headerButton: { minHeight: 40, paddingVertical: 8, paddingHorizontal: spacing.md },
  headerButtonText: { fontSize: 14, lineHeight: 17 },
  metricsTop: { flexDirection: 'row', gap: spacing.sm },
  metricCard: { flex: 1, minHeight: 112, justifyContent: 'center', gap: spacing.xs, padding: spacing.md },
  metricCardLabelFirst: { justifyContent: 'flex-start' },
  metricCardCentered: { alignItems: 'center' },
  metricValueSlot: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xs },
  metricValue: { color: colors.text, fontSize: 32, lineHeight: 37, fontWeight: '900', fontVariant: ['tabular-nums'] },
  metricLabel: { color: colors.textMuted, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  metricHelper: { color: colors.textSubtle, fontSize: 11, lineHeight: 14 },
  metricTextCentered: { textAlign: 'center' },
  middleGrid: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
  streakCard: { flex: 1.12, minHeight: 178, gap: spacing.sm },
  sideStats: { flex: 1, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: text.h3,
  cardSub: { ...text.muted, fontSize: 12, color: colors.textSubtle, textTransform: 'uppercase', fontWeight: '800' },
  muted: { ...text.muted },
  streakList: { flex: 1 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  partnerName: { flex: 1, minWidth: 0, color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  streakCount: { minWidth: 34, textAlign: 'right', color: colors.accent, fontSize: 20, lineHeight: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
  eloCard: { minHeight: 304, gap: spacing.md },
  chartPlaceholder: { flex: 1, minHeight: 250, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSoft },
  chartWrap: { flex: 1, minHeight: 250 },
  chartEmpty: { flex: 1, minHeight: 178, alignItems: 'center', justifyContent: 'center' },
  chartText: { ...text.muted, textAlign: 'center', paddingHorizontal: spacing.xl },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: -spacing.sm },
  chartMeta: { flex: 1, color: colors.textSubtle, fontSize: 11, lineHeight: 14, fontWeight: '700' }
});

export default TourneyDashboardScreen;
