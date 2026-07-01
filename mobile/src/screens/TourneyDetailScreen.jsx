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
import { proposeNextRound } from '../utils/tourneyPairing.js';
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
      setScores({});
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

  // Remove a net: its players go back to byes (they sit this round out).
  const removeNet = (index) => setRound((r) => {
    const freed = [...r.games[index].teamA, ...r.games[index].teamB];
    return {
      ...r,
      games: r.games.filter((_, i) => i !== index).map((g, i) => ({ ...g, net: i + 1 })),
      byes: [...r.byes, ...freed]
    };
  });

  // Add a net: pull 4 players out of byes into a new game.
  const addNet = () => setRound((r) => {
    if (r.byes.length < 4) { notify({ message: 'Need at least 4 byes to add a net.', type: 'warning' }); return r; }
    const four = r.byes.slice(0, 4);
    return {
      ...r,
      games: [...r.games, { uid: `g${r.roundNumber}_${Date.now()}`, net: r.games.length + 1, teamA: [four[0], four[1]], teamB: [four[2], four[3]] }],
      byes: r.byes.slice(4)
    };
  });

  // Commit the round's teams AND scores in one call.
  const submit = async () => {
    if (!round || round.games.length === 0) {
      notify({ message: 'Add at least one net (4 players).', type: 'warning' });
      return;
    }
    const invalid = round.games.some((g) => {
      const s = scores[g.uid] || {};
      const w = winnerSide(s);
      if (!w) return true;
      const loser = w === 'a' ? s.b : s.a;
      return loser === '' || loser == null;
    });
    if (invalid) { notify({ message: `Each game needs a winner (${pointsToWin}) and the other team's score.`, type: 'warning' }); return; }
    setBusy(true);
    try {
      const payload = {
        roundNumber: round.roundNumber,
        games: round.games.map((g) => {
          const s = scores[g.uid];
          const w = winnerSide(s);
          return {
            teamAPlayerIds: g.teamA.map((p) => p.id),
            teamBPlayerIds: g.teamB.map((p) => p.id),
            teamAScore: w === 'a' ? pointsToWin : Number.parseInt(s.a, 10),
            teamBScore: w === 'b' ? pointsToWin : Number.parseInt(s.b, 10)
          };
        })
      };
      await BackendApiService.commitTourneyRound(detail.id, payload);
      await onChange();
    } catch (err) {
      notify({ message: err.message || 'Failed to submit round', type: 'error' });
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
          const teamName = (side, name, align) => (
            <Pressable onPress={() => setWinner(m.id, side)} style={[styles.scoreTeamBtn, w === side && styles.scoreTeamWin]}>
              <Text style={[styles.scoreTeam, align, w === side && styles.scoreTeamTextWin]} numberOfLines={2}>{name}</Text>
            </Pressable>
          );
          const scoreBox = (side) => (
            <AppTextInput
              value={w === side ? String(pointsToWin) : (s[side] ?? '')}
              editable={w !== side}
              onChangeText={(v) => changeScore(m.id, side, v)}
              keyboardType="number-pad"
              style={styles.scoreInput}
              inputStyle={[styles.scoreInputBox, w === side && styles.scoreInputWin]}
            />
          );
          return (
            <View key={m.id} style={styles.scoreGame}>
              <Text style={styles.netLabel}>{m.court || 'Net'}</Text>
              <View style={styles.scoreRow}>
                {teamName('a', m.teamAName, styles.scoreTeamLeft)}
                {scoreBox('a')}
                <Text style={styles.scoreDash}>–</Text>
                {scoreBox('b')}
                {teamName('b', m.teamBName, styles.scoreTeamRight)}
              </View>
            </View>
          );
        })}
        <AppButton label="Finish round" onPress={finishRound} loading={busy} />
      </Card>
    );
  }

  const teamColumn = (g, side, isWin) => (
    <View style={[styles.teamColumn, isWin && styles.teamColumnWin]}>
      <View style={styles.team}>
        {(side === 'a' ? g.teamA : g.teamB).map((p) => (
          <PlayerChip key={p.id} player={p} lifted={lifted === p.id} onPress={() => tapPlayer(p.id)} />
        ))}
      </View>
      <AppTextInput
        value={isWin ? String(pointsToWin) : ((scores[g.uid] || {})[side] ?? '')}
        editable={!isWin}
        onChangeText={(v) => changeScore(g.uid, side, v)}
        keyboardType="number-pad"
        placeholder="score"
        style={styles.scoreInputWide}
        inputStyle={[styles.scoreInputBox, isWin && styles.scoreInputWin]}
      />
    </View>
  );

  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Round {round?.roundNumber || 1}</Text>
      <Text style={styles.hint}>Tap a player then another to swap. Type each game&apos;s scores — the team that reaches {pointsToWin} highlights red as the winner.</Text>
      {(round?.games || []).map((g, i) => {
        const w = winnerSide(scores[g.uid]);
        return (
          <View key={g.uid} style={styles.gameCard}>
            <View style={styles.gameHeader}>
              <Text style={styles.netLabel}>Net {i + 1}</Text>
              <Pressable onPress={() => removeNet(i)} hitSlop={8} style={styles.netRemove}>
                <Text style={styles.netRemoveText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.teamRow}>
              {teamColumn(g, 'a', w === 'a')}
              <Text style={styles.vs}>vs</Text>
              {teamColumn(g, 'b', w === 'b')}
            </View>
          </View>
        );
      })}
      <Pressable onPress={addNet} style={styles.addNet}>
        <Text style={styles.addNetText}>+ Add net</Text>
      </Pressable>
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
        <AppButton label="Submit" onPress={submit} loading={busy} />
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

// Read-only games summary shown once a tournament has ended.
const TourneyResults = ({ detail }) => {
  const matches = detail.matches || [];
  const rounds = [...new Set(matches.map((m) => m.roundNumber))].sort((a, b) => a - b);
  if (matches.length === 0) return null;
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Games</Text>
      {rounds.map((r) => (
        <View key={r} style={styles.scoreGame}>
          <Text style={styles.netLabel}>Round {r}</Text>
          {matches.filter((m) => m.roundNumber === r).map((m) => {
            const done = m.teamAScore != null && m.teamBScore != null;
            const aWon = done && m.teamAScore > m.teamBScore;
            const bWon = done && m.teamBScore > m.teamAScore;
            return (
              <View key={m.id} style={styles.scoreRow}>
                <Text style={[styles.scoreTeam, styles.scoreTeamLeft, aWon && styles.scoreTeamTextWin]} numberOfLines={2}>{m.teamAName}</Text>
                <Text style={styles.resultScore}>{m.teamAScore ?? '–'} : {m.teamBScore ?? '–'}</Text>
                <Text style={[styles.scoreTeam, styles.scoreTeamRight, bWon && styles.scoreTeamTextWin]} numberOfLines={2}>{m.teamBName}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </Card>
  );
};

const EndTournament = ({ detail, onChange }) => {
  const { notify } = useNotifications();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (detail.status === 'COMPLETE') {
    return <Text style={styles.endedNote}>This tournament has ended.</Text>;
  }

  const end = async () => {
    setBusy(true);
    try {
      await BackendApiService.updateTourneyTournament(detail.id, {
        name: detail.name,
        location: detail.location,
        tournamentDate: detail.tournamentDate,
        status: 'COMPLETE',
        format: detail.format,
        mode: detail.mode,
        courtCount: detail.courtCount,
        pointsToWin: detail.pointsToWin,
        notes: detail.notes
      });
      notify({ message: 'Tournament ended.', type: 'info' });
      await onChange();
    } catch (err) {
      notify({ message: err.message || 'Failed to end tournament', type: 'error' });
      setBusy(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return <AppButton label="End tournament" variant="secondary" onPress={() => setConfirming(true)} style={styles.endBtn} />;
  }
  return (
    <View style={styles.endConfirmRow}>
      <AppButton label="Back" variant="ghost" onPress={() => setConfirming(false)} style={styles.endHalf} />
      <AppButton label="Confirm" onPress={end} loading={busy} style={styles.endHalf} />
    </View>
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
      {detail.status === 'COMPLETE'
        ? <TourneyResults detail={detail} />
        : detail.mode === 'HISTORICAL'
          ? <HistoricalEditor detail={detail} onChange={load} />
          : <LiveRunner detail={detail} onChange={load} />}
      <EndTournament detail={detail} onChange={load} />
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
  endBtn: { marginTop: spacing.sm },
  endConfirmRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  endHalf: { flex: 1 },
  endedNote: { ...text.muted, textAlign: 'center', marginTop: spacing.sm },
  hint: { ...text.muted, fontSize: 13 },
  gameCard: { gap: spacing.xs, padding: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSoft },
  gameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  netRemove: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  netRemoveText: { color: colors.textMuted, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  addNet: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderStyle: 'dashed' },
  addNetText: { color: colors.textMuted, fontWeight: '800' },
  netLabel: { ...text.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  team: { gap: spacing.xs },
  teamColumn: { flex: 1, minWidth: 0, gap: spacing.xs, padding: spacing.xs, borderRadius: radius.sm },
  teamColumnWin: { backgroundColor: colors.accentSoft },
  scoreInputWide: { width: 84, alignSelf: 'center' },
  vs: { ...text.muted, fontWeight: '700' },
  byesCard: { gap: spacing.xs, padding: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderRadius: radius.md, borderStyle: 'dashed' },
  byesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { minHeight: 38, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  chipLifted: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '700' },
  chipTextLifted: { color: '#ffffff' },
  scoreGame: { gap: spacing.xs },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  scoreTeam: { color: colors.text, fontWeight: '700', fontSize: 13 },
  scoreTeamLeft: { textAlign: 'left' },
  scoreTeamRight: { textAlign: 'right' },
  scoreTeamBtn: { flex: 1, minWidth: 0, paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  scoreTeamWin: { backgroundColor: colors.accentSoft },
  scoreTeamTextWin: { color: colors.accent, fontWeight: '800' },
  scoreInput: { width: 52 },
  scoreInputBox: { textAlign: 'center', paddingHorizontal: 4, minHeight: 44 },
  scoreInputWin: { color: colors.accent, borderColor: colors.accent, fontWeight: '800' },
  scoreDash: { ...text.muted },
  resultScore: { color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'], paddingHorizontal: spacing.sm },
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
