import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Screen from '../components/Screen.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { colors, radius, spacing, text } from '../theme.js';

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
  const { user } = useAuth();
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuKind, setMenuKind] = useState(null); // 'MATCH' | 'TOURNAMENT' once picked

  const openMenu = () => { setMenuKind(null); setMenuOpen(true); };
  const closeMenu = () => { setMenuOpen(false); setMenuKind(null); };
  const pickFlow = (flow) => {
    const kind = menuKind;
    closeMenu();
    navigation.navigate('TourneyCreate', { kind, flow });
  };

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
            <Text style={styles.eyebrow}>Spikeball</Text>
            <Text style={styles.title}>Past tournaments</Text>
          </View>
          {isAdmin ? (
            <AppButton
              label="Create"
              onPress={openMenu}
              style={styles.createButton}
              textStyle={styles.createButtonText}
            />
          ) : null}
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
                <Text style={[styles.badge, item.status === 'COMPLETE' ? styles.badgeHist : styles.badgeLive]}>
                  {item.status === 'COMPLETE' ? 'Complete' : 'Live'}
                </Text>
              </View>
              <Text style={styles.tournamentDate}>{formatTournamentDate(item.tournamentDate)} · {item.playerCount} players</Text>
            </Card>
          </Pressable>
        )}
      />

      <Modal animationType="fade" transparent visible={menuOpen} onRequestClose={closeMenu}>
        <Pressable style={styles.sheetBackdrop} onPress={closeMenu}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            {menuKind === null ? (
              <>
                <Text style={styles.sheetTitle}>Create</Text>
                <CreateOption
                  title="Match"
                  subtitle="Casual rated games on one net — no scoreboard, just a log."
                  onPress={() => setMenuKind('MATCH')}
                />
                <CreateOption
                  title="Tourney"
                  subtitle="A full tournament with rounds, standings, and a scoreboard."
                  onPress={() => setMenuKind('TOURNAMENT')}
                />
              </>
            ) : (
              <>
                <Pressable style={styles.sheetBack} onPress={() => setMenuKind(null)}>
                  <Text style={styles.sheetBackText}>‹ Back</Text>
                </Pressable>
                <Text style={styles.sheetTitle}>{menuKind === 'MATCH' ? 'New match' : 'New tournament'}</Text>
                <CreateOption
                  title="Live"
                  subtitle="Start now and score round-by-round."
                  onPress={() => pickFlow('LIVE')}
                />
                <CreateOption
                  title="Historical"
                  subtitle="Back-fill a finished event with a chosen date."
                  onPress={() => pickFlow('HISTORICAL')}
                />
              </>
            )}
            <Pressable style={styles.sheetCancel} onPress={closeMenu}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
};

const CreateOption = ({ title, subtitle, onPress }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.sheetOption, pressed && styles.sheetOptionPressed]}
  >
    <Text style={styles.sheetOptionTitle}>{title}</Text>
    <Text style={styles.sheetOptionSubtitle}>{subtitle}</Text>
  </Pressable>
);

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
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)'
  },
  sheet: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong
  },
  sheetTitle: {
    ...text.muted,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    marginBottom: spacing.xs
  },
  sheetOption: {
    gap: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft
  },
  sheetOptionPressed: {
    backgroundColor: colors.surfacePressed
  },
  sheetOptionTitle: {
    ...text.h3,
    fontSize: 17
  },
  sheetOptionSubtitle: {
    ...text.muted,
    fontSize: 13,
    lineHeight: 17
  },
  sheetBack: {
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center'
  },
  sheetBackText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700'
  },
  sheetCancel: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs
  },
  sheetCancelText: {
    color: colors.textMuted,
    fontWeight: '700'
  }
});

export default TourneyScreen;
