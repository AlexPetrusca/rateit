import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Screen from '../components/Screen.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';

const formatTournamentDate = (value) => {
  if (!value) {
    return 'Date TBD';
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return value;
  }

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const TourneyScreen = ({ navigation }) => {
  const { notify } = useNotifications();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const nextTournaments = await BackendApiService.getTourneyTournaments();
      setTournaments(nextTournaments || []);
      setError('');
    } catch (err) {
      const message = err.message || 'Failed to load tournaments';
      setError(message);
      notify({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useFocusEffect(useCallback(() => {
    loadTournaments();
  }, [loadTournaments]));

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.eyebrow}>Tourney</Text>
            <Text style={styles.title}>Past tournaments</Text>
          </View>
          <AppButton
            label="Create"
            onPress={() => navigation.navigate('TourneyCreate')}
            style={styles.createButton}
            textStyle={styles.createButtonText}
          />
        </View>
      </View>
      <StatusMessage message={error} type="error" />
      <FlatList
        data={tournaments}
        refreshing={loading}
        onRefresh={loadTournaments}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? (
          <EmptyState title="No tournaments yet." message="Create one when you are ready to run the bracket." />
        ) : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('TourneyDetail', { tournamentId: item.id })}>
            <Card style={styles.tournamentRow}>
              <View style={styles.rowTop}>
                <Text style={styles.tournamentName} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.badge, item.mode === 'HISTORICAL' ? styles.badgeHist : styles.badgeLive]}>
                  {item.mode === 'HISTORICAL' ? 'Historical' : 'Live'}
                </Text>
              </View>
              <Text style={styles.tournamentDate}>{formatTournamentDate(item.tournamentDate)} · {item.playerCount} players</Text>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: spacing.md
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
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
  createButton: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg
  },
  createButtonText: {
    fontSize: 15,
    lineHeight: 18
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  tournamentRow: {
    paddingVertical: spacing.lg,
    gap: spacing.xs
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  tournamentName: {
    ...text.h3,
    flex: 1,
    minWidth: 0
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden'
  },
  badgeLive: {
    color: colors.accent,
    backgroundColor: colors.accentSoft
  },
  badgeHist: {
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted
  },
  tournamentDate: {
    ...text.muted
  }
});

export default TourneyScreen;
