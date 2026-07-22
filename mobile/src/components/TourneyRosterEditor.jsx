import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton.jsx';
import AppTextInput from './AppTextInput.jsx';
import Card from './Card.jsx';
import UserAvatar from './UserAvatar.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useTourneyPeople, normalizeName } from '../hooks/useTourneyPeople.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, radius, spacing, text } from '../theme.js';

// Roster for a live event, editable while it runs: people turn up late and leave
// early, so the field is built here rather than being fixed at creation time.
// Each toggle writes straight through to the tournament and refreshes the detail,
// so the round builder below always sees the current field.
const TourneyRosterEditor = ({ detail, onChange }) => {
  const { notify } = useNotifications();
  const { people, loading, reload, ensureTourneyPlayer } = useTourneyPeople();
  const [rawName, setRawName] = useState('');
  const [busyKey, setBusyKey] = useState(null);

  const roster = (detail.players || []).map((tp) => ({
    playerId: tp.player.id,
    displayName: tp.player.displayName,
    criticUserId: tp.player.criticUserId,
    profilePicUrl: tp.player.profilePicUrl
  }));

  const rosterEntry = (candidate) => roster.find((entry) => (
    candidate.playerId ? entry.playerId === candidate.playerId
      : candidate.criticUserId ? entry.criticUserId === candidate.criticUserId
        : (entry.displayName || '').toLowerCase() === (candidate.displayName || '').toLowerCase()
  ));

  const addPlayer = async (candidate) => {
    const playerId = await ensureTourneyPlayer(candidate);
    await BackendApiService.addTourneyTournamentPlayer(detail.id, {
      playerId,
      seedNumber: roster.length + 1,
      checkedIn: true
    });
  };

  const toggle = async (candidate, key) => {
    if (busyKey) {
      return;
    }
    setBusyKey(key);
    try {
      const existing = rosterEntry(candidate);
      if (existing) {
        // The backend refuses to drop someone already scheduled into a game, and
        // says so — surface that rather than a generic failure.
        await BackendApiService.removeTourneyTournamentPlayer(detail.id, existing.playerId);
      } else {
        await addPlayer(candidate);
      }
      await onChange();
      await reload();
    } catch (err) {
      notify({ message: err.message || 'Failed to update the roster', type: 'error' });
    } finally {
      setBusyKey(null);
    }
  };

  const addRaw = async () => {
    const displayName = normalizeName(rawName);
    if (!displayName) {
      return;
    }
    setRawName('');
    await toggle({ displayName }, `raw:${displayName.toLowerCase()}`);
  };

  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Players</Text>
        <Text style={styles.count}>
          {roster.length} in{loading ? ' · loading' : ''}
        </Text>
      </View>
      <Text style={styles.hint}>Tap to add or drop someone. You can do this mid-match as people arrive.</Text>

      <FlatList
        style={styles.playerList}
        contentContainerStyle={styles.playerListContent}
        data={people}
        keyExtractor={(person) => person.key}
        extraData={detail.players}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        initialNumToRender={10}
        windowSize={5}
        ListEmptyComponent={(
          <Text style={styles.muted}>{loading ? 'Loading players…' : 'No players found.'}</Text>
        )}
        renderItem={({ item: person }) => {
          const selected = Boolean(rosterEntry(person.candidate));
          return (
            <Pressable
              onPress={() => toggle(person.candidate, person.key)}
              disabled={busyKey != null}
              style={({ pressed }) => [styles.playerRow, pressed && styles.playerRowPressed]}
            >
              <UserAvatar username={person.displayName} profilePicUrl={person.profilePicUrl} size="sm" />
              <View style={styles.playerCopy}>
                <Text style={styles.playerName} numberOfLines={1}>{person.displayName}</Text>
                {person.guest ? <Text style={styles.playerBadgeGuest}>Guest</Text> : null}
              </View>
              <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                {selected ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
            </Pressable>
          );
        }}
      />

      <View style={styles.addRow}>
        <AppTextInput
          value={rawName}
          onChangeText={setRawName}
          placeholder="Add someone not on Critic"
          style={styles.addInput}
          onSubmitEditing={addRaw}
        />
        <AppButton label="Add" onPress={addRaw} variant="secondary" style={styles.addButton} />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: spacing.md
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sectionTitle: {
    ...text.body,
    fontWeight: '800'
  },
  count: {
    ...text.muted
  },
  hint: {
    ...text.muted,
    color: colors.textSubtle
  },
  playerList: {
    maxHeight: 260
  },
  playerListContent: {
    gap: spacing.xs
  },
  muted: {
    ...text.muted
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted
  },
  playerRowPressed: {
    backgroundColor: colors.surfacePressed
  },
  playerCopy: {
    flex: 1
  },
  playerName: {
    ...text.body
  },
  playerBadgeGuest: {
    ...text.muted,
    color: colors.textSubtle,
    fontSize: 12
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  checkmark: {
    ...text.body,
    color: colors.background,
    fontWeight: '800'
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  addInput: {
    flex: 1
  },
  addButton: {
    minWidth: 72
  }
});

export default TourneyRosterEditor;
