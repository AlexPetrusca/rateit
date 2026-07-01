import { memo, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton.jsx';
import UserAvatar from './UserAvatar.jsx';
import { colors, radius, spacing, text } from '../theme.js';

// Draggable player chip. Uses DOM Pointer Events (supported by iOS Safari) rather
// than PanResponder, which didn't reliably deliver continuous moves on web.
// touchAction:'none' stops the browser from hijacking the touch as a scroll.
// Players with a Critic account show a profile-pic circle; chips already placed
// in a net show an "x" to send them back to the buys pool without dragging.
const DraggableChip = memo(({ player, zone, onPickup, onRemove }) => (
  <View
    style={styles.chip}
    onPointerDown={(e) => onPickup(player, zone, e)}
  >
    {player.hasAccount ? <UserAvatar username={player.name} profilePicUrl={player.profilePicUrl} size={24} /> : null}
    <Text style={[styles.chipText, styles.chipTextFlex]} numberOfLines={1}>{player.name}</Text>
    {onRemove ? (
      <Pressable
        onPointerDown={(e) => { e.stopPropagation?.(); onRemove(player, zone); }}
        hitSlop={8}
        style={styles.chipX}
      >
        <Text style={styles.chipXText}>×</Text>
      </Pressable>
    ) : null}
  </View>
));

const emptyNet = () => ({ teamA: [], teamB: [] });
const pointOf = (e) => {
  const n = e?.nativeEvent || e;
  return { x: n.clientX ?? n.pageX ?? 0, y: n.clientY ?? n.pageY ?? 0 };
};

const TourneyRoundBuilder = ({ participants, roundNumber, saving, onCommit }) => {
  const [nets, setNets] = useState([emptyNet()]);
  const [selected, setSelected] = useState(0);
  const [dragName, setDragName] = useState(null);

  const selectedRef = useRef(0);
  selectedRef.current = selected;
  const last = useRef({ x: 0, y: 0 });
  const dragInfo = useRef(null);
  const boardRef = useRef(null);
  const pan = useRef(new Animated.ValueXY()).current;

  const assignedIds = useMemo(() => {
    const s = new Set();
    nets.forEach((n) => { [...n.teamA, ...n.teamB].forEach((p) => s.add(p.id)); });
    return s;
  }, [nets]);
  const pool = participants.filter((p) => !assignedIds.has(p.id));

  // Position the ghost (absolute inside the board) under the pointer. Using the
  // board's live viewport offset makes it stick to the finger regardless of page
  // scroll or transformed ancestors (which break position:fixed).
  const positionGhost = (x, y) => {
    const r = boardRef.current?.getBoundingClientRect?.();
    const ox = r ? r.left : 0;
    const oy = r ? r.top : 0;
    pan.setValue({ x: x - ox - 46, y: y - oy - 18 });
  };

  const place = (player, fromZone, target) => {
    if (!target || target === fromZone) return;
    const sel = selectedRef.current;
    setNets((cur) => {
      const copy = cur.map((n) => ({ teamA: [...n.teamA], teamB: [...n.teamB] }));
      if (fromZone === 'teamA') copy[sel].teamA = copy[sel].teamA.filter((p) => p.id !== player.id);
      if (fromZone === 'teamB') copy[sel].teamB = copy[sel].teamB.filter((p) => p.id !== player.id);
      if (target === 'teamA') {
        if (copy[sel].teamA.length >= 2) return cur;
        copy[sel].teamA.push(player);
      } else if (target === 'teamB') {
        if (copy[sel].teamB.length >= 2) return cur;
        copy[sel].teamB.push(player);
      }
      return copy;
    });
  };

  // Stable pickup handler so memoized chips never re-render.
  const onPickup = useRef((player, zone, e) => {
    const c = pointOf(e);
    last.current = c;
    dragInfo.current = { player, zone };
    positionGhost(c.x, c.y);
    setDragName(player.name);

    const onMove = (ev) => {
      const x = ev.clientX;
      const y = ev.clientY;
      if (x == null) return;
      last.current = { x, y };
      positionGhost(x, y);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      setDragName(null);
      const info = dragInfo.current;
      dragInfo.current = null;
      let target = null;
      const el = document.elementFromPoint(last.current.x, last.current.y);
      const zoneEl = el?.closest?.('[id^="tzone-"]');
      if (zoneEl) target = zoneEl.id.replace('tzone-', '');
      if (info) place(info.player, info.zone, target);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }).current;

  // Tap the "x" on a placed chip to send it back to the buys pool. Stable so
  // memoized chips don't re-render.
  const removeChip = useRef((player, fromZone) => {
    const sel = selectedRef.current;
    setNets((cur) => {
      const copy = cur.map((n) => ({ teamA: [...n.teamA], teamB: [...n.teamB] }));
      if (fromZone === 'teamA') copy[sel].teamA = copy[sel].teamA.filter((p) => p.id !== player.id);
      if (fromZone === 'teamB') copy[sel].teamB = copy[sel].teamB.filter((p) => p.id !== player.id);
      return copy;
    });
  }).current;

  const addNet = () => { setNets((n) => [...n, emptyNet()]); setSelected(nets.length); };
  const removeNet = () => {
    if (nets.length <= 1) { setNets([emptyNet()]); setSelected(0); return; }
    setNets((n) => n.filter((_, i) => i !== selected));
    setSelected((s) => Math.max(0, s - 1));
  };

  const readyGames = nets.filter((n) => n.teamA.length === 2 && n.teamB.length === 2);
  const commit = () => {
    onCommit(readyGames.map((n) => ({
      teamAPlayerIds: n.teamA.map((p) => p.id),
      teamBPlayerIds: n.teamB.map((p) => p.id)
    })));
    setNets([emptyNet()]);
    setSelected(0);
  };

  const net = nets[selected] || emptyNet();
  const dragging = dragName != null;

  const zone = (key, label, list) => (
    <View nativeID={`tzone-${key}`} style={[styles.zone, dragging && styles.zoneActive]}>
      <Text style={styles.zoneLabel}>{label}</Text>
      <View style={styles.zoneList}>
        {list.length === 0 ? <Text style={styles.zoneEmpty}>Drag here</Text> : list.map((p) => (
          <DraggableChip key={p.id} player={p} zone={key} onPickup={onPickup} onRemove={removeChip} />
        ))}
      </View>
    </View>
  );

  return (
    <View ref={boardRef} style={styles.board}>
      <View style={styles.tabs}>
        {nets.map((n, i) => (
          <Pressable key={i} onPress={() => setSelected(i)} style={[styles.tab, i === selected && styles.tabActive]}>
            <Text style={[styles.tabText, i === selected && styles.tabTextActive]}>Net {i + 1}</Text>
          </Pressable>
        ))}
        <Pressable onPress={addNet} style={styles.tabAdd}><Text style={styles.tabAddText}>+</Text></Pressable>
      </View>

      <View style={styles.columns}>
        {zone('teamA', 'Team A', net.teamA)}
        <Text style={styles.vs}>vs</Text>
        {zone('teamB', 'Team B', net.teamB)}
      </View>

      <View nativeID="tzone-pool" style={styles.pool}>
        <Text style={styles.zoneLabel}>Buys</Text>
        <View style={styles.zoneList}>
          {pool.length === 0 ? <Text style={styles.zoneEmpty}>Everyone is placed.</Text> : pool.map((p) => (
            <DraggableChip key={p.id} player={p} zone="pool" onPickup={onPickup} />
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        {nets.length > 1 ? <AppButton label="Remove net" variant="ghost" onPress={removeNet} style={styles.smallBtn} textStyle={styles.smallBtnText} /> : null}
        <AppButton label={`Save round ${roundNumber}`} onPress={commit} loading={saving} disabled={readyGames.length === 0} style={styles.smallBtn} textStyle={styles.smallBtnText} />
      </View>

      {dragging ? (
        <Animated.View pointerEvents="none" style={[styles.ghost, { transform: pan.getTranslateTransform() }]}>
          <Text style={styles.ghostText} numberOfLines={1}>{dragName}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  board: { gap: spacing.md },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  tab: { minHeight: 36, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.surfacePressed, borderColor: colors.text },
  tabText: { color: colors.textMuted, fontWeight: '700' },
  tabTextActive: { color: colors.text },
  tabAdd: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  tabAddText: { color: colors.textMuted, fontSize: 20, fontWeight: '800', lineHeight: 22 },
  columns: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  vs: { ...text.muted, alignSelf: 'center', fontWeight: '700' },
  zone: { flex: 1, minHeight: 120, padding: spacing.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surfaceSoft, gap: spacing.xs },
  zoneActive: { borderColor: colors.accent, borderStyle: 'dashed' },
  zoneLabel: { ...text.muted, fontSize: 11, textTransform: 'uppercase', fontWeight: '800' },
  zoneList: { gap: spacing.xs, minHeight: 44 },
  zoneEmpty: { ...text.muted, fontSize: 12, fontStyle: 'italic' },
  pool: { padding: spacing.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderStyle: 'dashed', gap: spacing.xs },
  chip: { minHeight: 40, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, touchAction: 'none', userSelect: 'none' },
  chipText: { color: colors.text, fontWeight: '700' },
  chipTextFlex: { flex: 1, minWidth: 0 },
  chipX: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, touchAction: 'none' },
  chipXText: { color: colors.textMuted, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  smallBtn: { minHeight: 40, paddingVertical: 9, paddingHorizontal: spacing.lg },
  smallBtnText: { fontSize: 14, lineHeight: 17 },
  ghost: { position: 'absolute', top: 0, left: 0, zIndex: 9999, minHeight: 40, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.accent, boxShadow: '0 6px 16px rgba(0,0,0,0.4)' },
  ghostText: { color: '#ffffff', fontWeight: '800' }
});

export default TourneyRoundBuilder;
