import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import TourneyHistoricalCreator from '../components/TourneyHistoricalCreator.jsx';
import TourneyScoreboard from '../components/TourneyScoreboard.jsx';
import TourneyMatchLog from '../components/TourneyMatchLog.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { proposeNextRound } from '../utils/tourneyPairing.js';
import { emitTourneyChanged } from '../utils/liveTourneyEvents.js';
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
  const isMatch = detail.isMatch;

  // Matches are win-by-two and can go past the target, so the higher score wins.
  // Tournaments cap at the winning score (only one side can reach it).
  const winnerSide = (s) => {
    const a = s?.a === '' || s?.a == null ? null : Number(s.a);
    const b = s?.b === '' || s?.b == null ? null : Number(s.b);
    if (isMatch) {
      if (a == null || b == null || a === b) return null;
      return a > b ? 'a' : 'b';
    }
    const aWin = a != null && a >= pointsToWin;
    const bWin = b != null && b >= pointsToWin;
    if (aWin && !bWin) return 'a';
    if (bWin && !aWin) return 'b';
    return null;
  };

  // Picking a winner (tap or typing the winning score) locks their score to the
  // winning score and clears the other side if it was also at/above it. Matches
  // are scored freely (win by two), so tapping a team does nothing there.
  const setWinner = (matchId, side) => {
    if (isMatch) return;
    setScores((cur) => {
      const s = { ...(cur[matchId] || { a: '', b: '' }) };
      if (side === 'a') { s.a = String(pointsToWin); if (Number(s.b) >= pointsToWin) s.b = ''; }
      else { s.b = String(pointsToWin); if (Number(s.a) >= pointsToWin) s.a = ''; }
      return { ...cur, [matchId]: s };
    });
  };

  const changeScore = (matchId, side, value) => {
    const digits = value.replace(/[^0-9]/g, '');
    setScores((cur) => ({ ...cur, [matchId]: { ...(cur[matchId] || { a: '', b: '' }), [side]: digits } }));
  };

  // On blur: a finished losing score (below the winning score) means the other
  // team must have won, so fill their score to the winning score. Waiting for
  // blur (rather than every keystroke) avoids jumping the gun while someone is
  // still typing e.g. "1" then "5" for 15.
  const settleScore = (matchId, side) => setScores((cur) => {
    if (isMatch) return cur; // win-by-two: enter both scores, no auto-fill to the target
    const s = cur[matchId] || { a: '', b: '' };
    const val = s[side];
    if (val === '' || val == null || Number(val) >= pointsToWin) return cur;
    const other = side === 'a' ? 'b' : 'a';
    if (s[other] !== '' && s[other] != null) return cur;
    return { ...cur, [matchId]: { ...s, [other]: String(pointsToWin) } };
  });

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
    if (invalid) { notify({ message: isMatch ? 'Each game needs two different scores.' : `Each game needs a winner (${pointsToWin}) and the other team's score.`, type: 'warning' }); return; }
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
            teamAScore: Number.parseInt(s.a, 10),
            teamBScore: Number.parseInt(s.b, 10)
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
    if (invalid) { notify({ message: isMatch ? 'Each game needs two different scores.' : `Each game needs a winner (${pointsToWin}) and the other team's score.`, type: 'warning' }); return; }
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
        <Text style={styles.hint}>{isMatch ? 'Enter both scores — the higher score wins (win by two).' : `Tap the winning team (or type ${pointsToWin}); enter the other team's score.`}</Text>
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
              value={!isMatch && w === side ? String(pointsToWin) : (s[side] ?? '')}
              editable={isMatch || w !== side}
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
        value={(scores[g.uid] || {})[side] ?? ''}
        onChangeText={(v) => changeScore(g.uid, side, v)}
        onBlur={() => settleScore(g.uid, side)}
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
      <Text style={styles.hint}>Tap a player then another to swap. Type each game&apos;s scores — {isMatch ? 'the higher score wins (win by two)' : `the team that reaches ${pointsToWin}`} highlights red as the winner.</Text>
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
            const hasWinner = done && m.teamAScore !== m.teamBScore;
            // The winner always displays on the left.
            const bWon = hasWinner && m.teamBScore > m.teamAScore;
            const leftName = bWon ? m.teamBName : m.teamAName;
            const rightName = bWon ? m.teamAName : m.teamBName;
            const leftScore = bWon ? m.teamBScore : m.teamAScore;
            const rightScore = bWon ? m.teamAScore : m.teamBScore;
            return (
              <View key={m.id} style={styles.scoreRow}>
                <Text style={[styles.scoreTeam, styles.scoreTeamLeft, hasWinner && styles.scoreTeamTextWin]} numberOfLines={2}>{leftName}</Text>
                <Text style={styles.resultScore}>{leftScore ?? '–'} : {rightScore ?? '–'}</Text>
                <Text style={[styles.scoreTeam, styles.scoreTeamRight]} numberOfLines={2}>{rightName}</Text>
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
      emitTourneyChanged();
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

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

// Full edit interface for a finished tournament: rename, re-date, adjust the
// roster, and per-round cards (identical to the live combined cards) to fix
// scores and move players around. Submits the whole thing in one call.
const TourneyEditor = ({ detail, onDone, onCancel, showMeta = true, markComplete = false }) => {
  const { notify } = useNotifications();

  const [name, setName] = useState(detail.name || '');
  const [date, setDate] = useState(detail.tournamentDate || todayIsoDate());
  const [criticUsers, setCriticUsers] = useState([]);
  const [existingPlayers, setExistingPlayers] = useState([]);
  const [roster, setRoster] = useState([]); // [{ id, name, profilePicUrl, criticUserId }]
  const [rounds, setRounds] = useState([]); // [{ roundNumber, games:[{ uid, teamA, teamB }], byes:[] }]
  const [scores, setScores] = useState({});
  const [lifted, setLifted] = useState(null); // { roundIdx, id }
  const [rawName, setRawName] = useState('');
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [busy, setBusy] = useState(false);

  // The higher score wins (historical scores may not follow first-to-N exactly).
  const winnerByScore = (s) => {
    const a = s?.a === '' || s?.a == null ? null : Number(s.a);
    const b = s?.b === '' || s?.b == null ? null : Number(s.b);
    if (a == null || b == null || a === b) return null;
    return a > b ? 'a' : 'b';
  };

  // Seed roster, rounds, and scores from the tournament detail.
  useEffect(() => {
    const teamById = new Map((detail.teams || []).map((t) => [t.id, t]));
    const playerOf = (p) => ({ id: p.id, name: p.displayName, profilePicUrl: p.profilePicUrl });
    const roster0 = (detail.players || []).map((tp) => ({
      id: tp.player.id,
      name: tp.player.displayName,
      profilePicUrl: tp.player.profilePicUrl,
      criticUserId: tp.player.criticUserId
    }));
    setRoster(roster0);

    const roundNums = [...new Set((detail.matches || []).map((m) => m.roundNumber))].sort((a, b) => a - b);
    const seededScores = {};
    const seededRounds = roundNums.map((rn) => {
      const games = (detail.matches || []).filter((m) => m.roundNumber === rn).map((m) => {
        const uid = `m${m.id}`;
        const ta = teamById.get(m.teamAId);
        const tb = teamById.get(m.teamBId);
        seededScores[uid] = {
          a: m.teamAScore != null ? String(m.teamAScore) : '',
          b: m.teamBScore != null ? String(m.teamBScore) : ''
        };
        return {
          uid,
          teamA: ta ? [playerOf(ta.playerOne), playerOf(ta.playerTwo)] : [],
          teamB: tb ? [playerOf(tb.playerOne), playerOf(tb.playerTwo)] : []
        };
      });
      const inGame = new Set();
      games.forEach((g) => [...g.teamA, ...g.teamB].forEach((p) => inGame.add(p.id)));
      const byes = roster0.filter((p) => !inGame.has(p.id));
      return { roundNumber: rn, games, byes };
    });
    setRounds(seededRounds);
    setScores(seededScores);
  }, [detail]);

  const loadPeople = useCallback(async () => {
    setLoadingPeople(true);
    try {
      const [users, players] = await Promise.all([
        BackendApiService.getTourneyCriticUsers(),
        BackendApiService.getTourneyPlayers()
      ]);
      setCriticUsers(users);
      setExistingPlayers(players);
    } catch (err) {
      notify({ message: err.message || 'Failed to load players', type: 'error' });
    } finally {
      setLoadingPeople(false);
    }
  }, [notify]);
  useEffect(() => { if (showMeta) loadPeople(); }, [loadPeople, showMeta]);

  const criticNames = useMemo(() => new Set(criticUsers.map((u) => u.username.toLowerCase())), [criticUsers]);
  const people = useMemo(() => {
    const criticPeople = criticUsers.map((u) => ({
      key: `critic:${u.userId}`, displayName: u.username, profilePicUrl: u.profilePicUrl,
      guest: false, playedBefore: u.playedBefore, candidate: { criticUserId: u.userId, displayName: u.username }
    }));
    const guestPeople = existingPlayers
      .filter((p) => p.criticUserId == null && !criticNames.has(p.displayName.toLowerCase()))
      .map((p) => ({
        key: `player:${p.id}`, displayName: p.displayName, profilePicUrl: p.profilePicUrl || null,
        guest: true, playedBefore: true, candidate: { playerId: p.id, displayName: p.displayName }
      }));
    return [...criticPeople, ...guestPeople].sort((a, b) => (
      (b.playedBefore === a.playedBefore ? 0 : b.playedBefore ? 1 : -1)
      || a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
    ));
  }, [criticUsers, existingPlayers, criticNames]);

  const inRoster = useCallback((cand) => roster.some((r) => (
    (cand.playerId && r.id === cand.playerId)
    || (cand.criticUserId && r.criticUserId === cand.criticUserId)
    || (r.name.toLowerCase() === cand.displayName.toLowerCase())
  )), [roster]);

  // Resolve a candidate to a persisted tourney player (create a guest/critic
  // player if one doesn't exist yet) so it has a stable id to place in games.
  const ensurePlayer = async (cand, profilePicUrl) => {
    if (cand.playerId) {
      return { id: cand.playerId, name: cand.displayName, profilePicUrl: profilePicUrl || null, criticUserId: null };
    }
    const existing = existingPlayers.find((p) => (cand.criticUserId
      ? p.criticUserId === cand.criticUserId
      : p.displayName.toLowerCase() === cand.displayName.toLowerCase()));
    if (existing) {
      return { id: existing.id, name: existing.displayName, profilePicUrl: existing.profilePicUrl || profilePicUrl || null, criticUserId: existing.criticUserId };
    }
    const created = await BackendApiService.createTourneyPlayer({ displayName: cand.displayName, criticUserId: cand.criticUserId || null });
    setExistingPlayers((cur) => [...cur, created]);
    return { id: created.id, name: created.displayName, profilePicUrl: created.profilePicUrl || profilePicUrl || null, criticUserId: created.criticUserId };
  };

  const addPlayer = async (cand, profilePicUrl) => {
    try {
      const p = await ensurePlayer(cand, profilePicUrl);
      setRoster((cur) => (cur.some((r) => r.id === p.id) ? cur : [...cur, p]));
      setRounds((cur) => cur.map((r) => (r.byes.some((b) => b.id === p.id) || r.games.some((g) => [...g.teamA, ...g.teamB].some((x) => x.id === p.id))
        ? r : { ...r, byes: [...r.byes, p] })));
    } catch (err) {
      notify({ message: err.message || 'Failed to add player', type: 'error' });
    }
  };

  const removePlayer = (cand) => {
    const entry = roster.find((r) => (
      (cand.playerId && r.id === cand.playerId)
      || (cand.criticUserId && r.criticUserId === cand.criticUserId)
      || (r.name.toLowerCase() === cand.displayName.toLowerCase())
    ));
    if (!entry) return;
    const usedInGame = rounds.some((r) => r.games.some((g) => [...g.teamA, ...g.teamB].some((p) => p.id === entry.id)));
    if (usedInGame) { notify({ message: `${entry.name} is still in a game — remove them from every net first.`, type: 'warning' }); return; }
    setRoster((cur) => cur.filter((r) => r.id !== entry.id));
    setRounds((cur) => cur.map((r) => ({ ...r, byes: r.byes.filter((p) => p.id !== entry.id) })));
  };

  const addRaw = async () => {
    const dn = rawName.trim().replace(/\s+/g, ' ');
    if (!dn) return;
    setRawName('');
    if (inRoster({ displayName: dn })) return;
    await addPlayer({ displayName: dn }, null);
  };

  const tapPlayer = (roundIdx, id) => {
    if (!lifted || lifted.roundIdx !== roundIdx) { setLifted({ roundIdx, id }); return; }
    if (lifted.id === id) { setLifted(null); return; }
    setRounds((rs) => rs.map((r, i) => (i === roundIdx ? swapPlayers(r, lifted.id, id) : r)));
    setLifted(null);
  };

  const changeScore = (uid, side, v) => {
    const d = v.replace(/[^0-9]/g, '');
    setScores((cur) => ({ ...cur, [uid]: { ...(cur[uid] || { a: '', b: '' }), [side]: d } }));
  };

  const removeNet = (roundIdx, gameIdx) => setRounds((rs) => rs.map((r, i) => {
    if (i !== roundIdx) return r;
    const freed = [...r.games[gameIdx].teamA, ...r.games[gameIdx].teamB];
    return { ...r, games: r.games.filter((_, gi) => gi !== gameIdx), byes: [...r.byes, ...freed] };
  }));

  const addNet = (roundIdx) => setRounds((rs) => rs.map((r, i) => {
    if (i !== roundIdx) return r;
    if (r.byes.length < 4) { notify({ message: 'Need at least 4 byes to add a net.', type: 'warning' }); return r; }
    const four = r.byes.slice(0, 4);
    return { ...r, games: [...r.games, { uid: `n${roundIdx}_${Date.now()}`, teamA: [four[0], four[1]], teamB: [four[2], four[3]] }], byes: r.byes.slice(4) };
  }));

  const addRound = () => setRounds((rs) => [...rs, {
    roundNumber: (rs.length ? Math.max(...rs.map((r) => r.roundNumber)) : 0) + 1,
    games: [], byes: [...roster]
  }]);

  const removeRound = (roundIdx) => setRounds((rs) => rs.filter((_, i) => i !== roundIdx).map((r, idx) => ({ ...r, roundNumber: idx + 1 })));

  const submit = async () => {
    if (!name.trim()) { notify({ message: 'Give the tournament a name.', type: 'warning' }); return; }
    const totalGames = rounds.reduce((n, r) => n + r.games.length, 0);
    if (totalGames === 0) { notify({ message: 'Add at least one round with a net.', type: 'warning' }); return; }
    for (const r of rounds) {
      for (const g of r.games) {
        const ids = [...g.teamA, ...g.teamB].map((p) => p.id);
        if (g.teamA.length !== 2 || g.teamB.length !== 2 || new Set(ids).size !== 4) {
          notify({ message: `Round ${r.roundNumber} has an incomplete net (needs 4 different players).`, type: 'warning' }); return;
        }
        const s = scores[g.uid] || {};
        if (s.a === '' || s.a == null || s.b === '' || s.b == null) {
          notify({ message: `Enter both scores in round ${r.roundNumber}.`, type: 'warning' }); return;
        }
        if (Number(s.a) === Number(s.b)) { notify({ message: `Scores can't tie (round ${r.roundNumber}).`, type: 'warning' }); return; }
      }
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        tournamentDate: date || null,
        status: markComplete ? 'COMPLETE' : null,
        playerIds: roster.map((r) => r.id),
        rounds: rounds.filter((r) => r.games.length > 0).map((r) => ({
          roundNumber: r.roundNumber,
          games: r.games.map((g) => ({
            teamAPlayerIds: g.teamA.map((p) => p.id),
            teamBPlayerIds: g.teamB.map((p) => p.id),
            teamAScore: Number.parseInt(scores[g.uid].a, 10),
            teamBScore: Number.parseInt(scores[g.uid].b, 10)
          }))
        }))
      };
      await BackendApiService.editTourneyTournament(detail.id, payload);
      notify({ message: 'Tournament updated.', type: 'info' });
      onDone();
    } catch (err) {
      notify({ message: err.message || 'Failed to save tournament', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const renderGame = (roundIdx, g, gi) => {
    const w = winnerByScore(scores[g.uid]);
    const col = (side) => (
      <View style={[styles.teamColumn, w === side && styles.teamColumnWin]}>
        <View style={styles.team}>
          {(side === 'a' ? g.teamA : g.teamB).map((p) => (
            <PlayerChip key={p.id} player={p} lifted={lifted && lifted.roundIdx === roundIdx && lifted.id === p.id} onPress={() => tapPlayer(roundIdx, p.id)} />
          ))}
        </View>
        <AppTextInput
          value={(scores[g.uid] || {})[side] ?? ''}
          onChangeText={(v) => changeScore(g.uid, side, v)}
          keyboardType="number-pad"
          placeholder="score"
          style={styles.scoreInputWide}
          inputStyle={[styles.scoreInputBox, w === side && styles.scoreInputWin]}
        />
      </View>
    );
    return (
      <View key={g.uid} style={styles.gameCard}>
        <View style={styles.gameHeader}>
          <Text style={styles.netLabel}>Net {gi + 1}</Text>
          <Pressable onPress={() => removeNet(roundIdx, gi)} hitSlop={8} style={styles.netRemove}>
            <Text style={styles.netRemoveText}>×</Text>
          </Pressable>
        </View>
        <View style={styles.teamRow}>
          {col('a')}
          <Text style={styles.vs}>vs</Text>
          {col('b')}
        </View>
      </View>
    );
  };

  return (
    <>
      {showMeta ? (
        <>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Tourney · Edit</Text>
          </View>

          <Card style={styles.section}>
            <AppTextInput label="Name" value={name} onChangeText={setName} />
            <AppTextInput label="Tournament date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          </Card>

          <Card style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Players</Text>
              <Text style={styles.count}>{roster.length} selected{loadingPeople ? ' · loading' : ''}</Text>
            </View>
            <ScrollView style={styles.playerList} contentContainerStyle={styles.playerListContent} nestedScrollEnabled showsVerticalScrollIndicator>
              {people.length === 0 ? (
                <Text style={styles.mutedPad}>{loadingPeople ? 'Loading players…' : 'No players found.'}</Text>
              ) : people.map((person) => {
                const selected = inRoster(person.candidate);
                return (
                  <Pressable
                    key={person.key}
                    onPress={() => (selected ? removePlayer(person.candidate) : addPlayer(person.candidate, person.profilePicUrl))}
                    style={({ pressed }) => [styles.playerRow, pressed && styles.playerRowPressed]}
                  >
                    <UserAvatar username={person.displayName} profilePicUrl={person.profilePicUrl} size="sm" />
                    <View style={styles.playerCopy}>
                      <Text style={styles.playerName} numberOfLines={1}>{person.displayName}</Text>
                      {person.guest ? <Text style={styles.playerBadgeGuest}>Guest</Text> : person.playedBefore ? <Text style={styles.playerBadge}>Played before</Text> : null}
                    </View>
                    <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                      {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.addRow}>
              <AppTextInput value={rawName} onChangeText={setRawName} placeholder="Add someone not on Critic" style={styles.addInput} onSubmitEditing={addRaw} />
              <AppButton label="Add" onPress={addRaw} variant="secondary" style={styles.addButton} />
            </View>
          </Card>
        </>
      ) : (
        <Text style={styles.hint}>Add a round, then a net, and tap two players to swap them into teams. Enter each game&apos;s score.</Text>
      )}

      {rounds.map((r, ri) => (
        <Card key={ri} style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Round {r.roundNumber}</Text>
            <Pressable onPress={() => removeRound(ri)} hitSlop={8} style={styles.netRemove}>
              <Text style={styles.netRemoveText}>×</Text>
            </Pressable>
          </View>
          {r.games.map((g, gi) => renderGame(ri, g, gi))}
          <Pressable onPress={() => addNet(ri)} style={styles.addNet}>
            <Text style={styles.addNetText}>+ Add net</Text>
          </Pressable>
          {r.byes.length > 0 ? (
            <View style={styles.byesCard}>
              <Text style={styles.netLabel}>Byes</Text>
              <View style={styles.byesRow}>
                {r.byes.map((p) => (
                  <PlayerChip key={p.id} player={p} lifted={lifted && lifted.roundIdx === ri && lifted.id === p.id} onPress={() => tapPlayer(ri, p.id)} />
                ))}
              </View>
            </View>
          ) : null}
        </Card>
      ))}

      <Pressable onPress={addRound} style={styles.addNet}>
        <Text style={styles.addNetText}>+ Add round</Text>
      </Pressable>

      {showMeta ? (
        <View style={styles.endConfirmRow}>
          <AppButton label="Cancel" variant="ghost" onPress={onCancel} style={styles.endHalf} />
          <AppButton label="Submit" onPress={submit} loading={busy} style={styles.endHalf} />
        </View>
      ) : (
        <AppButton label="Submit" onPress={submit} loading={busy} />
      )}
    </>
  );
};

// Kebab menu (Edit / Delete) shown on a finished tournament.
const TourneyMenu = ({ onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <View style={styles.menuWrap}>
      <Pressable onPress={() => { setOpen((o) => !o); setConfirming(false); }} hitSlop={8} style={styles.kebab}>
        <Text style={styles.kebabText}>⋯</Text>
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {confirming ? (
            <>
              <Text style={styles.menuConfirm}>Delete this tournament?</Text>
              <Pressable onPress={() => { setOpen(false); setConfirming(false); onDelete(); }} style={styles.menuItem}>
                <Text style={styles.menuItemDanger}>Delete</Text>
              </Pressable>
              <Pressable onPress={() => setConfirming(false)} style={styles.menuItem}>
                <Text style={styles.menuItemText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable onPress={() => { setOpen(false); onEdit(); }} style={styles.menuItem}>
                <Text style={styles.menuItemText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => setConfirming(true)} style={styles.menuItem}>
                <Text style={styles.menuItemDanger}>Delete</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
};

const TourneyDetailScreen = ({ route, navigation }) => {
  const tournamentId = route.params?.tournamentId;
  const { notify } = useNotifications();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

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

  // Auto-refresh for players watching a live tournament: poll while it's in
  // progress so they see rounds/scores as the admin enters them, without
  // needing to leave and come back. Admins are excluded — they're the ones
  // editing, and refetching would clobber their in-progress round entry.
  useEffect(() => {
    if (isAdmin || !detail || detail.status === 'COMPLETE') {
      return undefined;
    }
    const id = setInterval(() => { load(); }, 10000);
    return () => clearInterval(id);
  }, [isAdmin, detail?.status, load]); // eslint-disable-line react-hooks/exhaustive-deps

  // Surface the tourney tab bar for ended tournaments (a read-only view), so
  // there's an easy way out besides the back button. Live/historical entry
  // stays a full-screen flow with the bar hidden.
  useEffect(() => {
    navigation.setParams({ tourneyNavVisible: detail?.status === 'COMPLETE' });
  }, [detail?.status, navigation]);

  const deleteTournament = useCallback(async () => {
    try {
      await BackendApiService.deleteTourneyTournament(tournamentId);
      emitTourneyChanged();
      notify({ message: 'Tournament deleted.', type: 'info' });
      navigation.navigate('Tourney');
    } catch (err) {
      notify({ message: err.message || 'Failed to delete tournament', type: 'error' });
    }
  }, [tournamentId, navigation, notify]);

  if (loading && !detail) {
    return <Screen><View style={styles.center}><ActivityIndicator color={colors.accent} /></View></Screen>;
  }
  if (!detail) return null;

  if (editing && isAdmin) {
    return (
      <Screen>
        <TourneyEditor detail={detail} onDone={() => { setEditing(false); load(); }} onCancel={() => setEditing(false)} />
      </Screen>
    );
  }

  // Non-admins get a read-only view: leaderboard + game-by-game, no editing.
  const hideScoreboard = isAdmin && detail.mode === 'HISTORICAL' && detail.status !== 'COMPLETE';

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{detail.isMatch ? 'Match' : 'Tourney'} · {detail.status === 'COMPLETE' ? 'Complete' : 'Live'}</Text>
          <Text style={styles.title}>{detail.name}</Text>
          <Text style={styles.sub}>{detail.playerCount} players · to {detail.pointsToWin}{!detail.isMatch && detail.mode !== 'HISTORICAL' && detail.courtCount ? ` · ${detail.courtCount} net${detail.courtCount > 1 ? 's' : ''}` : ''}</Text>
        </View>
        {isAdmin && detail.status === 'COMPLETE' ? (
          <TourneyMenu onEdit={() => setEditing(true)} onDelete={deleteTournament} />
        ) : null}
      </View>
      {detail.isMatch
        ? <TourneyMatchLog matches={detail.matches} />
        : (hideScoreboard ? null : <TourneyScoreboard standings={detail.playerStandings} />)}
      {!isAdmin ? (
        detail.isMatch ? null : <TourneyResults detail={detail} />
      ) : detail.status === 'COMPLETE' ? (
        detail.isMatch ? null : <TourneyResults detail={detail} />
      ) : detail.mode === 'HISTORICAL' ? (
        <TourneyHistoricalCreator detail={detail} onDone={load} />
      ) : (
        <>
          <LiveRunner detail={detail} onChange={load} />
          <EndTournament detail={detail} onChange={load} />
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  header: { gap: spacing.xs, flex: 1, minWidth: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  eyebrow: { ...text.muted, color: colors.textSubtle, textTransform: 'uppercase', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  title: text.h1,
  sub: text.muted,
  section: { gap: spacing.md },
  sectionTitle: text.h3,
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: text.muted,
  // Kebab menu
  menuWrap: { position: 'relative' },
  kebab: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  kebabText: { color: colors.text, fontSize: 22, fontWeight: '900', lineHeight: 24 },
  menu: { position: 'absolute', top: 42, right: 0, minWidth: 180, zIndex: 20, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderRadius: radius.md, paddingVertical: spacing.xs, gap: 2, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  menuItem: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg },
  menuItemText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  menuItemDanger: { color: colors.danger || '#d64545', fontSize: 15, fontWeight: '700' },
  menuConfirm: { ...text.muted, paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: 2 },
  // Editor player picker
  playerList: { maxHeight: 300, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSoft },
  playerListContent: { padding: spacing.xs },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  playerRowPressed: { backgroundColor: colors.surfacePressed },
  playerCopy: { flex: 1, minWidth: 0, gap: 2 },
  playerName: { color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  playerBadge: { ...text.muted, color: colors.accent, fontSize: 12, fontWeight: '700' },
  playerBadgeGuest: { ...text.muted, color: colors.textSubtle, fontSize: 12, fontWeight: '700' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { color: '#ffffff', fontSize: 15, fontWeight: '900', lineHeight: 18 },
  mutedPad: { ...text.muted, padding: spacing.sm },
  addRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'flex-end' },
  addInput: { flex: 1, minWidth: 190 },
  addButton: { minWidth: 82 },
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
