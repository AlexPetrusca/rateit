import { StyleSheet, Text, View } from 'react-native';
import Card from './Card.jsx';
import { colors, spacing, text } from '../theme.js';

// A match's game-by-game log (newest first): each team's name, the score, and the
// Elo change for that game. Replaces the scoreboard for matches (which don't have
// standings/win totals). teamAEloDelta comes from the backend; team B's is its
// negation.
const formatDelta = (value) => {
  if (value == null) return '';
  const rounded = Math.round(Number(value));
  return rounded > 0 ? `+${rounded}` : String(rounded);
};

const TeamLine = ({ name, score, delta, won }) => {
  const d = Number(delta ?? 0);
  return (
    <View style={styles.teamLine}>
      <Text style={[styles.team, won && styles.win]} numberOfLines={1}>{name}</Text>
      <Text style={[styles.score, won && styles.win]}>{score}</Text>
      <Text style={[styles.delta, d > 0 && styles.pos, d < 0 && styles.neg]}>{formatDelta(delta)}</Text>
    </View>
  );
};

const TourneyMatchLog = ({ matches = [], title = 'Log' }) => {
  const games = matches.filter((m) => m.completed).slice().reverse();
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.statHead}>ELO</Text>
      </View>
      {games.length === 0 ? (
        <Text style={styles.muted}>No games logged yet.</Text>
      ) : games.map((m) => {
        const aWon = Number(m.teamAScore) > Number(m.teamBScore);
        const aDelta = m.teamAEloDelta;
        const bDelta = aDelta == null ? null : -Number(aDelta);
        return (
          <View key={m.id} style={styles.game}>
            <TeamLine name={m.teamAName} score={m.teamAScore} delta={aDelta} won={aWon} />
            <TeamLine name={m.teamBName} score={m.teamBScore} delta={bDelta} won={!aWon} />
          </View>
        );
      })}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: text.h3,
  statHead: { ...text.muted, fontSize: 12 },
  game: {
    gap: 2,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border
  },
  teamLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  team: { flex: 1, minWidth: 0, color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  win: { color: colors.text },
  score: { width: 34, textAlign: 'right', color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] },
  delta: { width: 40, textAlign: 'right', color: colors.textMuted, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pos: { color: colors.accent },
  neg: { color: colors.textMuted },
  muted: { ...text.muted, paddingVertical: spacing.sm }
});

export default TourneyMatchLog;
