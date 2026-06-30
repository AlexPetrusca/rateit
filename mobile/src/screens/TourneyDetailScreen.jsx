import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import TourneyScoreboard from '../components/TourneyScoreboard.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { proposeNextRound, roundToCommitPayload } from '../utils/tourneyPairing.js';
import { colors, radius, spacing, text } from '../theme.js';

// Swap two players (by id) anywhere in a proposed round (games or byes).
const swapPlayers = (round, idA, idB) => {
  const clone = JSON.parse(JSON.stringify(round));
  const arrays = [];
  clone.games.forEach((g) => { arrays.push(g.teamA, g.teamB); });
  arrays.push(clone.byes);
  let locA = null;
  let locB = null;
  arrays.forEach((arr) => {
    arr.forEach((p, idx) => {
      if (p.id === idA) locA = { arr, idx };
      if (p.id === idB) locB = { arr, idx };
    });
  });
  if (!locA || !locB) return round;
  const tmp = locA.arr[locA.idx];
  locA.arr[locA.idx] = locB.arr[locB.idx];
  locB.arr[locB.idx] = tmp;
  return clone;
};

const PlayerChip = ({ player, lifted, onPress }) => (
  <Pressable onPress={onPress} style={[styles.chip, lifted && styles.chipLifted]}>
    <Text style={[styles.chipText, lifted && styles.chipTextLifted]} numberOfLines={1}>{player.name}</Text>
  </Pressable>
);

const LiveRunner = ({ detail, onChange }) => {
  const { notify } = useNotifications();
  const matches = detail.matches || [];
  const rounds = useMemo(() => [...new Set(matches.map((m) => m.roundNumber))].sort((a, b) => a - b), [matches]);
  const latestRound = rounds.length ? rounds[rounds.length - 1] : 0;
  const latestMatches = useMemo(() => matches.filter((m) => m.roundNumber === latestRound), [matches, latestRound]);
  const scoringActive = latestRound > 0 && latestMatches.some((m) => !m.completed);

  const [round, setRound] = useState(null); // editable proposed groupings
  const [lifted, setLifted] = useState(null);
  const [scores, setScores] = useState({});
  const [busy, setBusy] = useState(false);

  // Recompute the proposed groupings whenever we're in the groupings stage.
  useEffect(() => {
    if (!scoringActive) {
      setRound(proposeNextRound(detail));
      setLifted(null);
    }
  }, [detail, scoringActive]);

  // Seed score inputs from the active round.
  useEffect(() => {
    if (scoringActive) {
      const init = {};
      latestMatches.forEach((m) => {
        init[m.id] = {
          a: m.teamAScore != null ? String(m.teamAScore) : '',
          b: m.teamBScore != null ? String(m.teamBScore) : ''
        };
      });
      setScores(init);
    }
  }, [scoringActive, latestRound]); // eslint-disable-line react-hooks/exhaustive-deps

  const tapPlayer = (id) => {
    if (lifted == null) { setLifted(id); return; }
    if (lifted === id) { setLifted(null); return; }
    setRound((r) => swapPlayers(r, lifted, id));
    setLifted(null);
  };

  const startRound = async () => {
    if (!round || round.games.length === 0) {
      notify({ message: 'Not enough players for a game (need at least 4).', type: 'warning' });
      return;
    }
    setBusy(true);
    try {
      await BackendApiService.commitTourneyRound(detail.id, roundToCommitPayload(round));
      await onChange();
    } catch (err) {
      notify({ message: err.message || 'Failed to start round', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const finishRound = async () => {
    const missing = latestMatches.some((m) => {
      const s = scores[m.id] || {};
      return s.a === '' || s.b === '' || s.a == null || s.b == null;
    });
    if (missing) { notify({ message: 'Enter a score for every game.', type: 'warning' }); return; }
    setBusy(true);
    try {
      for (const m of latestMatches) {
        const s = scores[m.id];
        await BackendApiService.updateTourneyMatchScore(detail.id, m.id, {
          teamAScore: Number.parseInt(s.a, 10),
          teamBScore: Number.parseInt(s.b, 10)
        });
      }
      await onChange();
    } catch (err) {
      notify({ message: err.message || 'Failed to save scores', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (scoringActive) {
    return (
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Round {latestRound} · enter scores</Text>
        {latestMatches.map((m) => (
          <View key={m.id} style={styles.scoreGame}>
            <Text style={styles.netLabel}>{m.court || 'Net'}</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreTeam} numberOfLines={2}>{m.teamAName}</Text>
              <AppTextInput
                value={(scores[m.id]?.a) ?? ''}
                onChangeText={(v) => setScores((cur) => ({ ...cur, [m.id]: { ...cur[m.id], a: v.replace(/[^0-9]/g, '') } }))}
                keyboardType="number-pad"
                style={styles.scoreInput}
                inputStyle={styles.scoreInputBox}
              />
              <Text style={styles.scoreDash}>–</Text>
              <AppTextInput
                value={(scores[m.id]?.b) ?? ''}
                onChangeText={(v) => setScores((cur) => ({ ...cur, [m.id]: { ...cur[m.id], b: v.replace(/[^0-9]/g, '') } }))}
                keyboardType="number-pad"
                style={styles.scoreInput}
                inputStyle={styles.scoreInputBox}
              />
              <Text style={styles.scoreTeam} numberOfLines={2}>{m.teamBName}</Text>
            </View>
          </View>
        ))}
        <AppButton label="Finish round" onPress={finishRound} loading={busy} />
      </Card>
    );
  }

  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Round {round?.roundNumber || 1}</Text>
      <Text style={styles.hint}>Tap a player, then tap another to swap them between games/byes.</Text>
      {(round?.games || []).map((g, i) => (
        <View key={i} style={styles.gameCard}>
          <Text style={styles.netLabel}>Net {g.net}</Text>
          <View style={styles.teamRow}>
            <View style={styles.team}>
              {g.teamA.map((p) => <PlayerChip key={p.id} player={p} lifted={lifted === p.id} onPress={() => tapPlayer(p.id)} />)}
            </View>
            <Text style={styles.vs}>vs</Text>
            <View style={styles.team}>
              {g.teamB.map((p) => <PlayerChip key={p.id} player={p} lifted={lifted === p.id} onPress={() => tapPlayer(p.id)} />)}
            </View>
          </View>
        </View>
      ))}
      {(round?.byes?.length || 0) > 0 ? (
        <View style={styles.byesCard}>
          <Text style={styles.netLabel}>Byes</Text>
          <View style={styles.byesRow}>
            {round.byes.map((p) => <PlayerChip key={p.id} player={p} lifted={lifted === p.id} onPress={() => tapPlayer(p.id)} />)}
          </View>
        </View>
      ) : null}
      {(round?.games?.length || 0) === 0 ? (
        <Text style={styles.hint}>Add at least 4 players to start a round.</Text>
      ) : (
        <AppButton label={`Start round ${round?.roundNumber || 1}`} onPress={startRound} loading={busy} />
      )}
    </Card>
  );
};

const HistoricalEditor = ({ detail, onChange }) => {
  const { notify } = useNotifications();
  const participants = (detail.players || []).map((tp) => ({ id: tp.player.id, name: tp.player.displayName }));
  const matches = detail.matches || [];
  const [slots, setSlots] = useState([null, null, null, null]); // A1, A2, B1, B2
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState({});

  const usedSlotIds = new Set(slots.filter(Boolean).map((p) => p.id));

  const assign = (player) => {
    if (usedSlotIds.has(player.id)) { // remove if already placed
      setSlots((s) => s.map((x) => (x && x.id === player.id ? null : x)));
      return;
    }
    const idx = slots.findIndex((x) => x == null);
    if (idx < 0) return;
    setSlots((s) => s.map((x, i) => (i === idx ? player : x)));
  };

  const addGame = async () => {
    if (slots.some((x) => x == null)) { notify({ message: 'Pick 4 players (2 per team).', type: 'warning' }); return; }
    setBusy(true);
    try {
      const nextRound = (matches.length ? Math.max(...matches.map((m) => m.roundNumber)) : 0) + 1;
      await BackendApiService.commitTourneyRound(detail.id, {
        roundNumber: nextRound,
        games: [{ teamAPlayerIds: [slots[0].id, slots[1].id], teamBPlayerIds: [slots[2].id, slots[3].id] }]
      });
      setSlots([null, null, null, null]);
      await onChange();
    } catch (err) {
      notify({ message: err.message || 'Failed to add game', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const saveScore = async (m) => {
    const s = scores[m.id] || {};
    if (s.a === '' || s.b === '' || s.a == null || s.b == null) { notify({ message: 'Enter both scores.', type: 'warning' }); return; }
    try {
      await BackendApiService.updateTourneyMatchScore(detail.id, m.id, { teamAScore: Number.parseInt(s.a, 10), teamBScore: Number.parseInt(s.b, 10) });
      await onChange();
    } catch (err) {
      notify({ message: err.message || 'Failed to save score', type: 'error' });
    }
  };

  const removeGame = async (m) => {
    try { await BackendApiService.deleteTourneyMatch(detail.id, m.id); await onChange(); }
    catch (err) { notify({ message: err.message || 'Failed to delete game', type: 'error' }); }
  };

  const slotLabel = ['Team A', 'Team A', 'Team B', 'Team B'];

  return (
    <>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Add a game</Text>
        <View style={styles.slotRow}>
          {slots.map((p, i) => (
            <View key={i} style={styles.slot}>
              <Text style={styles.slotLabel}>{slotLabel[i]}</Text>
              <Text style={[styles.slotName, !p && styles.slotEmpty]} numberOfLines={1}>{p ? p.name : '—'}</Text>
            </View>
          ))}
        </View>
        <View style={styles.chips}>
          {participants.map((p) => (
            <PlayerChip key={p.id} player={p} lifted={usedSlotIds.has(p.id)} onPress={() => assign(p)} />
          ))}
        </View>
        <AppButton label="Add game" onPress={addGame} loading={busy} variant="secondary" />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Games ({matches.length})</Text>
        {matches.length === 0 ? <Text style={styles.hint}>No games yet.</Text> : matches.map((m) => (
          <View key={m.id} style={styles.histGame}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreTeam} numberOfLines={2}>{m.teamAName}</Text>
              <AppTextInput
                value={(scores[m.id]?.a) ?? (m.teamAScore != null ? String(m.teamAScore) : '')}
                onChangeText={(v) => setScores((cur) => ({ ...cur, [m.id]: { ...cur[m.id], a: v.replace(/[^0-9]/g, ''), b: cur[m.id]?.b ?? (m.teamBScore != null ? String(m.teamBScore) : '') } }))}
                keyboardType="number-pad" style={styles.scoreInput} inputStyle={styles.scoreInputBox}
              />
              <Text style={styles.scoreDash}>–</Text>
              <AppTextInput
                value={(scores[m.id]?.b) ?? (m.teamBScore != null ? String(m.teamBScore) : '')}
                onChangeText={(v) => setScores((cur) => ({ ...cur, [m.id]: { ...cur[m.id], b: v.replace(/[^0-9]/g, ''), a: cur[m.id]?.a ?? (m.teamAScore != null ? String(m.teamAScore) : '') } }))}
                keyboardType="number-pad" style={styles.scoreInput} inputStyle={styles.scoreInputBox}
              />
              <Text style={styles.scoreTeam} numberOfLines={2}>{m.teamBName}</Text>
            </View>
            <View style={styles.histActions}>
              <AppButton label="Save" onPress={() => saveScore(m)} variant="secondary" style={styles.histBtn} textStyle={styles.histBtnText} />
              <AppButton label="Delete" onPress={() => removeGame(m)} variant="ghost" style={styles.histBtn} textStyle={styles.histBtnText} />
            </View>
          </View>
        ))}
      </Card>
    </>
  );
};

const TourneyDetailScreen = ({ route }) => {
  const tournamentId = route.params?.tournamentId;
  const { notify } = useNotifications();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setDetail(await BackendApiService.getTourneyTournament(tournamentId));
    } catch (err) {
      notify({ message: err.message || 'Failed to load tournament', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [tournamentId, notify]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !detail) {
    return <Screen><View style={styles.center}><ActivityIndicator color={colors.accent} /></View></Screen>;
  }
  if (!detail) return null;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Tourney · {detail.mode === 'HISTORICAL' ? 'Historical' : 'Live'}</Text>
        <Text style={styles.title}>{detail.name}</Text>
        <Text style={styles.sub}>{detail.playerCount} players · to {detail.pointsToWin}{detail.mode !== 'HISTORICAL' && detail.courtCount ? ` · ${detail.courtCount} net${detail.courtCount > 1 ? 's' : ''}` : ''}</Text>
      </View>
      <TourneyScoreboard standings={detail.playerStandings} />
      {detail.mode === 'HISTORICAL'
        ? <HistoricalEditor detail={detail} onChange={load} />
        : <LiveRunner detail={detail} onChange={load} />}
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  header: { gap: spacing.xs },
  eyebrow: { ...text.muted, color: colors.textSubtle, textTransform: 'uppercase', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  title: text.h1,
  sub: text.muted,
  section: { gap: spacing.md },
  sectionTitle: text.h3,
  hint: { ...text.muted, fontSize: 13 },
  gameCard: { gap: spacing.xs, padding: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSoft },
  netLabel: { ...text.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  team: { flex: 1, gap: spacing.xs },
  vs: { ...text.muted, fontWeight: '700' },
  byesCard: { gap: spacing.xs, padding: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderRadius: radius.md, borderStyle: 'dashed' },
  byesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { minHeight: 38, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  chipLifted: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '700' },
  chipTextLifted: { color: '#ffffff' },
  scoreGame: { gap: spacing.xs },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  scoreTeam: { flex: 1, minWidth: 0, color: colors.text, fontWeight: '700', fontSize: 13 },
  scoreInput: { width: 52 },
  scoreInputBox: { textAlign: 'center', paddingHorizontal: 4, minHeight: 44 },
  scoreDash: { ...text.muted },
  slotRow: { flexDirection: 'row', gap: spacing.xs },
  slot: { flex: 1, padding: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surfaceSoft, gap: 2 },
  slotLabel: { ...text.muted, fontSize: 10, textTransform: 'uppercase', fontWeight: '800' },
  slotName: { color: colors.text, fontWeight: '700', fontSize: 13 },
  slotEmpty: { color: colors.textSubtle },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  histGame: { gap: spacing.xs, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  histActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  histBtn: { minHeight: 36, paddingVertical: 7, paddingHorizontal: spacing.md },
  histBtnText: { fontSize: 13, lineHeight: 16 }
});

export default TourneyDetailScreen;
