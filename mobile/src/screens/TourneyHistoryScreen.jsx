import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Screen from '../components/Screen.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { colors, radius, spacing, text } from '../theme.js';

const formatDate = (value) => {
  if (!value) {
    return '';
  }
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) {
    return String(value);
  }
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const joinNames = (names, fallback) => (
  names && names.length ? names.join(' & ') : fallback
);

// Every finished game the logged-in player has played, newest first, told from
// their side: partner, opponents, score, win or loss.
const TourneyHistoryScreen = () => {
  const { notify } = useNotifications();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await BackendApiService.getMyTourneyMatches();
      setMatches(rows || []);
      setError('');
    } catch (err) {
      const message = err.message || 'Failed to load match history';
      setError(message);
      notify({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const record = useMemo(() => {
    const wins = matches.filter((m) => m.won).length;
    return { wins, losses: matches.length - wins };
  }, [matches]);

  const winPct = record.wins + record.losses > 0
    ? Math.round((record.wins / (record.wins + record.losses)) * 100)
    : 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Tourney · History</Text>
        <Text style={styles.title}>My matches</Text>
      </View>

      <StatusMessage message={error} type="error" />

      {matches.length > 0 ? (
        <Card style={styles.recordCard}>
          <View style={styles.recordItem}>
            <Text style={styles.recordValue}>{record.wins}–{record.losses}</Text>
            <Text style={styles.recordLabel}>Record</Text>
          </View>
          <View style={styles.recordItem}>
            <Text style={styles.recordValue}>{winPct}%</Text>
            <Text style={styles.recordLabel}>Win rate</Text>
          </View>
          <View style={styles.recordItem}>
            <Text style={styles.recordValue}>{matches.length}</Text>
            <Text style={styles.recordLabel}>Games</Text>
          </View>
        </Card>
      ) : null}

      {loading && matches.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : null}

      {!loading && matches.length === 0 ? (
        <EmptyState
          title="No matches yet"
          message="Games you play in show up here once they're scored."
        />
      ) : null}

      {/* A plain map, not a FlatList: Screen already wraps its children in a
          ScrollView, and nesting a VirtualizedList inside one breaks scrolling
          entirely. These rows carry no images, so there is nothing to virtualize. */}
      <View style={styles.list}>
        {matches.map((item) => (
          <Card key={String(item.matchId)} style={styles.row}>
            <View style={[styles.result, item.won ? styles.resultWin : styles.resultLoss]}>
              <Text style={styles.resultText}>{item.won ? 'W' : 'L'}</Text>
            </View>

            <View style={styles.rowCopy}>
              <Text style={styles.vsLine} numberOfLines={1}>
                vs {joinNames(item.opponents, 'Unknown')}
              </Text>
              <Text style={styles.subLine} numberOfLines={1}>
                {joinNames(item.teammates, 'Solo')}
                {item.playedOn ? ` · ${formatDate(item.playedOn)}` : ''}
                {item.isMatch ? '' : ` · ${item.tournamentName}`}
              </Text>
            </View>

            <Text style={[styles.score, item.won ? styles.scoreWin : styles.scoreLoss]}>
              {item.myScore}–{item.opponentScore}
            </Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs
  },
  eyebrow: {
    ...text.muted,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800'
  },
  title: text.h1,
  center: {
    paddingVertical: spacing.xl,
    alignItems: 'center'
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  recordItem: {
    alignItems: 'center',
    gap: spacing.xs
  },
  recordValue: {
    ...text.h2
  },
  recordLabel: {
    ...text.muted,
    color: colors.textSubtle,
    fontSize: 12
  },
  list: {
    gap: spacing.sm
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md
  },
  result: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  resultWin: {
    backgroundColor: colors.accentSoft
  },
  resultLoss: {
    backgroundColor: colors.surfaceMuted
  },
  resultText: {
    ...text.body,
    fontWeight: '800'
  },
  rowCopy: {
    flex: 1,
    gap: 2
  },
  vsLine: {
    ...text.body,
    fontWeight: '700'
  },
  subLine: {
    ...text.muted,
    color: colors.textSubtle,
    fontSize: 12
  },
  score: {
    ...text.body,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm
  },
  scoreWin: {
    color: colors.accent
  },
  scoreLoss: {
    color: colors.textMuted
  }
});

export default TourneyHistoryScreen;
