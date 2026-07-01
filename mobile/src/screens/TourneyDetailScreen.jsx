import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import TourneyRoundBuilder from '../components/TourneyRoundBuilder.jsx';
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
  const pointsToWin = detail.pointsToWin || 15;

  // A team "wins" once it reaches the winning score; only one side can.
  const winnerSide = (s) => {
    const aWin = Number(s?.a) >= pointsToWin;
    const bWin = Number(s?.b) >= pointsToWin;
    if (aWin && !bWin) return 'a';
    if (bWin && !aWin) return 'b';
    return null;
  };

  // Picking a winner (tap or typing the winning score) locks their score to the
  // winning score and clears the other side if it was also at/above it.
  const setWinner = (matchId, side) => setScores((cur) => {
    const s = { ...(cur[matchId] || { a: '', b: '' }) };
    if (side === 'a') { s.a = String(pointsToWin); if (Number(s.b) >= pointsToWin) s.b = ''; }
    else { s.b = String(pointsToWin); if (Number(s.a) >= pointsToWin) s.a = ''; }
    return { ...cur, [matchId]: s };
  });

  const changeScore = (matchId, side, value) => {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits !== '' && Number(digits) >= pointsToWin) { setWinner(matchId, side); return; }
    setScores((cur) => ({ ...cur, [matchId]: { ...(cur[matchId] || { a: '', b: '' }), [side]: digits } }));
  };

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
    const invalid = latestMatches.some((m) => {
      const s = scores[m.id] || {};
      const w = winnerSide(s);
      if (!w) return true; // one team must reach the winning score
      const loser = w === 'a' ? s.b : s.a;
      return loser === '' || loser == null; // the losing team still needs a score
    });
    if (invalid) { notify({ message: `Each game needs a winner (${pointsToWin}) and the other team's score.`, type: 'warning' }); return; }
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
        <Text style={styles.hint}>Tap the winning team (or type {pointsToWin}); enter the other team&apos;s score.</Text>
        {latestMatches.map((m) => {
          const s = scores[m.id] || { a: '', b: '' };
          const w = winnerSide(s);
          const cell = (side, name) => {
            const isWin = w === side;
            return (
              <View style={styles.teamCell}>
                <Pressable onPress={() => setWinner(m.id, side)} style={[styles.teamPill, isWin && styles.teamPillWin]}>
                  <Text style={[styles.teamPillText, isWin && styles.teamPillTextWin]} numberOfLines={2}>{name}</Text>
                </Pressable>
                <AppTextInput
                  value={isWin ? String(pointsToWin) : (s[side] ?? '')}
                  editable={!isWin}
                  onChangeText={(v) => changeScore(m.id, side, v)}
                  keyboardType="number-pad"
                  style={styles.scoreInput}
                  inputStyle={[styles.scoreInputBox, isWin && styles.scoreInputWin]}
                />
              </View>
            );
          };
          return (
            <View key={m.id} style={styles.scoreGame}>
              <Text style={styles.netLabel}>{m.court || 'Net'}</Text>
              <View style={styles.scoreRow}>
                {cell('a', m.teamAName)}
                <Text style={styles.scoreDash}>–</Text>
                {cell('b', m.teamBName)}
              </View>
            </View>
          );
        })}
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
  const participants = (detail.players || []).map((tp) => ({
    id: tp.player.id,
    name: tp.player.displayName,
    profilePicUrl: tp.player.profilePicUrl,
    hasAccount: !!tp.player.criticUsername
  }));
  const matches = detail.matches || [];
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState({});

  const nextRound = (matches.length ? Math.max(...matches.map((m) => m.roundNumber)) : 0) + 1;

  const commitRound = async (games) => {
    if (!games.length) { notify({ message: 'Fill at least one net (2 players per team).', type: 'warning' }); return; }
    setBusy(true);
    try {
      await BackendApiService.commitTourneyRound(detail.id, { roundNumber: nextRound, games });
      await onChange();
    } catch (err) {
      notify({ message: err.message || 'Failed to save round', type: 'error' });
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

  return (
    <>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Build round {nextRound}</Text>
        <Text style={styles.hint}>Pick a net, then drag players into Team A and Team B.</Text>
        <TourneyRoundBuilder participants={participants} roundNumber={nextRound} saving={busy} onCommit={commitRound} />
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
  scoreRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  scoreTeam: { flex: 1, minWidth: 0, color: colors.text, fontWeight: '700', fontSize: 13 },
  scoreInput: { width: 52 },
  scoreInputBox: { textAlign: 'center', paddingHorizontal: 4, minHeight: 44 },
  scoreInputWin: { color: colors.textSubtle, backgroundColor: colors.surfaceMuted },
  scoreDash: { ...text.muted, marginTop: 10 },
  teamCell: { flex: 1, minWidth: 0, alignItems: 'center', gap: spacing.xs },
  teamPill: { width: '100%', minHeight: 40, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surfaceSoft },
  teamPillWin: { backgroundColor: '#e7c14a', borderColor: '#e7c14a' },
  teamPillText: { color: colors.text, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  teamPillTextWin: { color: '#1a1400' },
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
