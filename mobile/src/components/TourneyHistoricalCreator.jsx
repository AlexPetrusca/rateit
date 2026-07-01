import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton.jsx';
import AppTextInput from './AppTextInput.jsx';
import Card from './Card.jsx';
import UserAvatar from './UserAvatar.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { colors, radius, spacing, text } from '../theme.js';

// Draggable player chip (DOM Pointer Events — reliable on iOS Safari, unlike
// PanResponder). Placed chips show an "x" to send them back to the byes pool.
const DraggableChip = memo(({ player, onPickup, onRemove }) => (
  <View style={styles.chip} onPointerDown={(e) => onPickup(player, e)}>
    {player.hasAccount ? <UserAvatar username={player.name} profilePicUrl={player.profilePicUrl} size={22} /> : null}
    <Text style={[styles.chipText, styles.chipTextFlex]} numberOfLines={1}>{player.name}</Text>
    {onRemove ? (
      <Pressable onPointerDown={(e) => { e.stopPropagation?.(); onRemove(player); }} hitSlop={8} style={styles.chipX}>
        <Text style={styles.chipXText}>×</Text>
      </Pressable>
    ) : null}
  </View>
));

const pointOf = (e) => {
  const n = e?.nativeEvent || e;
  return { x: n.clientX ?? n.pageX ?? 0, y: n.clientY ?? n.pageY ?? 0 };
};
const newGame = () => ({ uid: `n${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, teamA: [], teamB: [] });

// Historical results entry: build each round's nets by dragging players into
// empty Team A / Team B slots, enter scores, then submit — which saves every
// round and marks the tournament COMPLETE so it reads/edits like a live one.
const TourneyHistoricalCreator = ({ detail, onDone }) => {
  const { notify } = useNotifications();
  const pointsToWin = detail.pointsToWin || 15;

  const roster = (detail.players || []).map((tp) => ({
    id: tp.player.id,
    name: tp.player.displayName,
    profilePicUrl: tp.player.profilePicUrl,
    hasAccount: !!tp.player.criticUsername
  }));

  const [rounds, setRounds] = useState([{ roundNumber: 1, games: [newGame()] }]);
  const [scores, setScores] = useState({});
  const [dragName, setDragName] = useState(null);
  const [busy, setBusy] = useState(false);

  // Seed from any rounds already entered (e.g. re-opening an unsubmitted draft).
  useEffect(() => {
    const matches = detail.matches || [];
    if (matches.length === 0) return;
    const teamById = new Map((detail.teams || []).map((t) => [t.id, t]));
    const playerOf = (p) => ({ id: p.id, name: p.displayName, profilePicUrl: p.profilePicUrl, hasAccount: !!p.criticUsername });
    const roundNums = [...new Set(matches.map((m) => m.roundNumber))].sort((a, b) => a - b);
    const seededScores = {};
    const seeded = roundNums.map((rn) => ({
      roundNumber: rn,
      games: matches.filter((m) => m.roundNumber === rn).map((m) => {
        const uid = `m${m.id}`;
        const ta = teamById.get(m.teamAId);
        const tb = teamById.get(m.teamBId);
        seededScores[uid] = { a: m.teamAScore != null ? String(m.teamAScore) : '', b: m.teamBScore != null ? String(m.teamBScore) : '' };
        return { uid, teamA: ta ? [playerOf(ta.playerOne), playerOf(ta.playerTwo)] : [], teamB: tb ? [playerOf(tb.playerOne), playerOf(tb.playerTwo)] : [] };
      })
    }));
    setRounds(seeded);
    setScores(seededScores);
  }, [detail]);

  const boardRef = useRef(null);
  const last = useRef({ x: 0, y: 0 });
  const dragInfo = useRef(null);
  const pan = useRef(new Animated.ValueXY()).current;

  // Winner = the higher of two filled scores, or a single side that has already
  // reached the winning score.
  const winnerByScore = (s) => {
    const a = s?.a === '' || s?.a == null ? null : Number(s.a);
    const b = s?.b === '' || s?.b == null ? null : Number(s.b);
    if (a != null && b != null) return a === b ? null : (a > b ? 'a' : 'b');
    if (a != null && a >= pointsToWin) return 'a';
    if (b != null && b >= pointsToWin) return 'b';
    return null;
  };

  const positionGhost = (x, y) => {
    const r = boardRef.current?.getBoundingClientRect?.();
    pan.setValue({ x: x - (r ? r.left : 0) - 46, y: y - (r ? r.top : 0) - 18 });
  };

  // Move a player into a target zone within a round: drop them from anywhere in
  // that round first, then add to the target team (max 2) or the byes pool.
  const place = (player, target) => {
    if (!target) return;
    setRounds((cur) => cur.map((r, i) => {
      if (i !== target.ri) return r;
      const games = r.games.map((g) => ({
        ...g,
        teamA: g.teamA.filter((p) => p.id !== player.id),
        teamB: g.teamB.filter((p) => p.id !== player.id)
      }));
      if (target.kind === 'bye') return { ...r, games };
      const g = games[target.gi];
      if (!g || g[target.kind].length >= 2) return { ...r, games };
      games[target.gi] = { ...g, [target.kind]: [...g[target.kind], player] };
      return { ...r, games };
    }));
  };

  const parseZone = (id) => {
    const parts = id.replace('tzone-', '').split('-');
    const ri = Number(parts[0]);
    if (parts[1] === 'bye') return { ri, kind: 'bye' };
    return { ri, gi: Number(parts[1]), kind: parts[2] === 'a' ? 'teamA' : 'teamB' };
  };

  const onPickup = useRef((player, e) => {
    const c = pointOf(e);
    last.current = c;
    dragInfo.current = player;
    positionGhost(c.x, c.y);
    setDragName(player.name);
    const onMove = (ev) => {
      if (ev.clientX == null) return;
      last.current = { x: ev.clientX, y: ev.clientY };
      positionGhost(ev.clientX, ev.clientY);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      setDragName(null);
      const p = dragInfo.current;
      dragInfo.current = null;
      const el = document.elementFromPoint(last.current.x, last.current.y);
      const zoneEl = el?.closest?.('[id^="tzone-"]');
      if (p && zoneEl) place(p, parseZone(zoneEl.id));
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }).current;

  const removeChip = (ri, player) => setRounds((cur) => cur.map((r, i) => (i !== ri ? r : {
    ...r,
    games: r.games.map((g) => ({ ...g, teamA: g.teamA.filter((p) => p.id !== player.id), teamB: g.teamB.filter((p) => p.id !== player.id) }))
  })));

  const changeScore = (uid, side, v) => {
    const d = v.replace(/[^0-9]/g, '');
    setScores((cur) => ({ ...cur, [uid]: { ...(cur[uid] || { a: '', b: '' }), [side]: d } }));
  };

  // On blur: a finished losing score (below the winning score) means the other
  // team must have won, so fill their score to the winning score.
  const settleScore = (uid, side) => setScores((cur) => {
    const s = cur[uid] || { a: '', b: '' };
    const val = s[side];
    if (val === '' || val == null || Number(val) >= pointsToWin) return cur;
    const other = side === 'a' ? 'b' : 'a';
    if (s[other] !== '' && s[other] != null) return cur;
    return { ...cur, [uid]: { ...s, [other]: String(pointsToWin) } };
  });

  const addNet = (ri) => setRounds((cur) => cur.map((r, i) => (i === ri ? { ...r, games: [...r.games, newGame()] } : r)));
  const removeNet = (ri, gi) => setRounds((cur) => cur.map((r, i) => (i === ri ? { ...r, games: r.games.filter((_, gx) => gx !== gi) } : r)));
  const addRound = () => setRounds((cur) => [...cur, { roundNumber: (cur.length ? Math.max(...cur.map((r) => r.roundNumber)) : 0) + 1, games: [newGame()] }]);
  const removeRound = (ri) => setRounds((cur) => cur.filter((_, i) => i !== ri).map((r, idx) => ({ ...r, roundNumber: idx + 1 })));

  const submit = async () => {
    if (rounds.every((r) => r.games.length === 0)) {
      notify({ message: 'Add at least one round with a net.', type: 'warning' }); return;
    }
    for (const r of rounds) {
      for (const g of r.games) {
        const ids = [...g.teamA, ...g.teamB].map((p) => p.id);
        if (g.teamA.length !== 2 || g.teamB.length !== 2 || new Set(ids).size !== 4) {
          notify({ message: `Round ${r.roundNumber} has an incomplete net (drag in 4 different players).`, type: 'warning' }); return;
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
      await BackendApiService.editTourneyTournament(detail.id, {
        name: detail.name,
        tournamentDate: detail.tournamentDate || null,
        status: 'COMPLETE',
        playerIds: roster.map((p) => p.id),
        rounds: rounds.filter((r) => r.games.length > 0).map((r) => ({
          roundNumber: r.roundNumber,
          games: r.games.map((g) => ({
            teamAPlayerIds: g.teamA.map((p) => p.id),
            teamBPlayerIds: g.teamB.map((p) => p.id),
            teamAScore: Number.parseInt(scores[g.uid].a, 10),
            teamBScore: Number.parseInt(scores[g.uid].b, 10)
          }))
        }))
      });
      notify({ message: 'Tournament saved.', type: 'info' });
      onDone();
    } catch (err) {
      notify({ message: err.message || 'Failed to save tournament', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const dragging = dragName != null;

  const teamZone = (ri, gi, side, list, isWin, uid) => (
    <View style={[styles.teamColumn, isWin && styles.teamColumnWin]}>
      <View nativeID={`tzone-${ri}-${gi}-${side === 'teamA' ? 'a' : 'b'}`} style={[styles.zone, list.length === 0 && styles.zoneCenter, dragging && styles.zoneActive]}>
        {list.length === 0 ? <Text style={styles.zonePlaceholder}>{side === 'teamA' ? 'Team A' : 'Team B'}</Text> : list.map((p) => (
          <DraggableChip key={p.id} player={p} onPickup={onPickup} onRemove={(pl) => removeChip(ri, pl)} />
        ))}
      </View>
      <AppTextInput
        value={(scores[uid] || {})[side === 'teamA' ? 'a' : 'b'] ?? ''}
        onChangeText={(v) => changeScore(uid, side === 'teamA' ? 'a' : 'b', v)}
        onBlur={() => settleScore(uid, side === 'teamA' ? 'a' : 'b')}
        keyboardType="number-pad"
        placeholder="score"
        style={styles.scoreInputWide}
        inputStyle={[styles.scoreInputBox, isWin && styles.scoreInputWin]}
      />
    </View>
  );

  return (
    <View ref={boardRef}>
      <Text style={styles.hint}>Drag players from Byes into Team A and Team B, then enter each game&apos;s score.</Text>

      {rounds.map((r, ri) => {
        const assigned = new Set();
        r.games.forEach((g) => [...g.teamA, ...g.teamB].forEach((p) => assigned.add(p.id)));
        const pool = roster.filter((p) => !assigned.has(p.id));
        return (
          <Card key={ri} style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Round {r.roundNumber}</Text>
              <Pressable onPress={() => removeRound(ri)} hitSlop={8} style={styles.netRemove}><Text style={styles.netRemoveText}>×</Text></Pressable>
            </View>

            {r.games.map((g, gi) => {
              const w = winnerByScore(scores[g.uid]);
              return (
                <View key={g.uid} style={styles.gameCard}>
                  <View style={styles.gameHeader}>
                    <Text style={styles.netLabel}>Net {gi + 1}</Text>
                    <Pressable onPress={() => removeNet(ri, gi)} hitSlop={8} style={styles.netRemove}><Text style={styles.netRemoveText}>×</Text></Pressable>
                  </View>
                  <View style={styles.teamRow}>
                    {teamZone(ri, gi, 'teamA', g.teamA, w === 'a', g.uid)}
                    <Text style={styles.vs}>vs</Text>
                    {teamZone(ri, gi, 'teamB', g.teamB, w === 'b', g.uid)}
                  </View>
                </View>
              );
            })}

            <Pressable onPress={() => addNet(ri)} style={styles.addNet}><Text style={styles.addNetText}>+ Add net</Text></Pressable>

            <View nativeID={`tzone-${ri}-bye`} style={[styles.byesCard, dragging && styles.zoneActive]}>
              <Text style={styles.netLabel}>Byes</Text>
              <View style={styles.byesRow}>
                {pool.length === 0 ? <Text style={styles.zoneEmpty}>Everyone is placed.</Text> : pool.map((p) => (
                  <DraggableChip key={p.id} player={p} onPickup={onPickup} />
                ))}
              </View>
            </View>
          </Card>
        );
      })}

      <Pressable onPress={addRound} style={styles.addNet}><Text style={styles.addNetText}>+ Add round</Text></Pressable>
      <AppButton label="Submit" onPress={submit} loading={busy} style={styles.submit} />

      {dragging ? (
        <Animated.View pointerEvents="none" style={[styles.ghost, { transform: pan.getTranslateTransform() }]}>
          <Text style={styles.ghostText} numberOfLines={1}>{dragName}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: spacing.md },
  sectionTitle: text.h3,
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hint: { ...text.muted, fontSize: 13, marginBottom: spacing.xs },
  gameCard: { gap: spacing.xs, padding: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSoft },
  gameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  netLabel: { ...text.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  netRemove: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  netRemoveText: { color: colors.textMuted, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  teamRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  teamColumn: { flex: 1, minWidth: 0, gap: spacing.xs, padding: spacing.xs, borderRadius: radius.sm },
  teamColumnWin: { backgroundColor: colors.accentSoft },
  zone: { minHeight: 92, padding: spacing.xs, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface, gap: spacing.xs },
  zoneCenter: { alignItems: 'center', justifyContent: 'center' },
  zoneActive: { borderColor: colors.accent, borderStyle: 'dashed' },
  zonePlaceholder: { ...text.muted, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  zoneEmpty: { ...text.muted, fontSize: 12, fontStyle: 'italic' },
  scoreInputWide: { width: 84, alignSelf: 'center' },
  scoreInputBox: { textAlign: 'center', paddingHorizontal: 4, minHeight: 44 },
  scoreInputWin: { color: colors.accent, borderColor: colors.accent, fontWeight: '800' },
  vs: { ...text.muted, fontWeight: '700', alignSelf: 'center' },
  addNet: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderStyle: 'dashed', marginTop: spacing.sm },
  addNetText: { color: colors.textMuted, fontWeight: '800' },
  byesCard: { gap: spacing.xs, padding: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderRadius: radius.md, borderStyle: 'dashed' },
  byesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, minHeight: 44 },
  chip: { minHeight: 40, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, touchAction: 'none', userSelect: 'none' },
  chipText: { color: colors.text, fontWeight: '700' },
  chipTextFlex: { flex: 1, minWidth: 0 },
  chipX: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11, touchAction: 'none' },
  chipXText: { color: colors.textMuted, fontSize: 16, fontWeight: '800', lineHeight: 18 },
  submit: { marginTop: spacing.md },
  ghost: { position: 'absolute', top: 0, left: 0, zIndex: 9999, minHeight: 40, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.accent, boxShadow: '0 6px 16px rgba(0,0,0,0.4)' },
  ghostText: { color: '#ffffff', fontWeight: '800' }
});

export default TourneyHistoricalCreator;
