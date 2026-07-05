import { StyleSheet, Text, View } from 'react-native';
import Card from './Card.jsx';
import UserAvatar from './UserAvatar.jsx';
import { colors, spacing, text } from '../theme.js';

// Players ranked by wins (tiebreak point differential) — playerStandings comes
// pre-sorted from the backend. The second stat column is each player's Elo
// change within this tournament (from just the rounds played so far, if live).
const formatEloDelta = (value) => {
  const rounded = Math.round(Number(value ?? 0));
  return rounded > 0 ? `+${rounded}` : String(rounded);
};

const TourneyScoreboard = ({ standings = [], title = 'Scoreboard' }) => (
  <Card style={styles.card}>
    <View style={styles.headerRow}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.statCols}>
        <Text style={styles.statHead}>W-L</Text>
        <Text style={styles.statHead}>BYE</Text>
        <Text style={styles.statHead}>ELO</Text>
      </View>
    </View>
    {standings.length === 0 ? (
      <Text style={styles.muted}>No games played yet.</Text>
    ) : standings.map((s, i) => {
      const eloDelta = Number(s.eloDelta ?? 0);
      return (
        <View key={s.playerId} style={styles.row}>
          <Text style={styles.rank}>{i + 1}</Text>
          <UserAvatar username={s.playerName} profilePicUrl={s.profilePicUrl} size="sm" />
          <Text style={styles.name} numberOfLines={1}>{s.playerName}</Text>
          <View style={styles.statCols}>
            <Text style={styles.stat}>{s.wins}-{s.losses}</Text>
            <Text style={styles.stat}>{s.byes ?? 0}</Text>
            <Text style={[styles.stat, eloDelta > 0 && styles.pos, eloDelta < 0 && styles.neg]}>
              {formatEloDelta(s.eloDelta)}
            </Text>
          </View>
        </View>
      );
    })}
  </Card>
);

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: text.h3,
  statCols: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end' },
  statHead: { ...text.muted, fontSize: 12, width: 40, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rank: { ...text.muted, width: 20, textAlign: 'center', fontVariant: ['tabular-nums'] },
  name: { flex: 1, minWidth: 0, color: colors.text, fontWeight: '700', fontSize: 15 },
  stat: { color: colors.text, fontWeight: '700', width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
  pos: { color: colors.accent },
  neg: { color: colors.textMuted },
  muted: { ...text.muted, paddingVertical: spacing.sm }
});

export default TourneyScoreboard;
