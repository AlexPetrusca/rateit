import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { useTourneyPeople, normalizeName, playerKey, samePlayer } from '../hooks/useTourneyPeople.js';
import { emitTourneyChanged } from '../utils/liveTourneyEvents.js';
import { colors, radius, spacing, text } from '../theme.js';

const SPORTS = [
  { value: 'spikeball', label: 'Spikeball' },
  { value: 'basketball', label: 'Basketball' }
];

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

// "YYYY-MM-DD" -> "MM-DD-YYYY" for the generated tournament name.
const toNameDate = (iso) => {
  const [y, m, d] = (iso || todayIsoDate()).split('-');
  return `${m}-${d}-${y}`;
};

// Live/Historical is chosen up front in the Create popup and passed as a route
// param, so this screen no longer shows the toggle — it just presets the mode.
const TourneyCreateScreen = ({ navigation, route }) => {
  const { notify } = useNotifications();
  const mode = route.params?.flow === 'HISTORICAL' ? 'HISTORICAL' : 'LIVE';
  const isHistorical = mode === 'HISTORICAL';
  const isMatch = route.params?.kind === 'MATCH';
  const kindLabel = isMatch ? 'match' : 'tournament';
  const { people, loading: loadingUsers, ensureTourneyPlayer } = useTourneyPeople();
  const [sport, setSport] = useState('spikeball');
  const [sportOpen, setSportOpen] = useState(false);
  const [tournamentDate, setTournamentDate] = useState(todayIsoDate());
  const [courtCount, setCourtCount] = useState('1');
  const [pointsToWin, setPointsToWin] = useState('15');
  const [rawName, setRawName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sportLabel = useMemo(() => SPORTS.find((s) => s.value === sport)?.label || 'Spikeball', [sport]);

  const isSelected = useCallback((candidate) => (
    selectedPlayers.some((selected) => samePlayer(selected, candidate))
  ), [selectedPlayers]);

  const addSelectedPlayer = useCallback((player) => {
    setSelectedPlayers((current) => (
      current.some((selected) => samePlayer(selected, player)) ? current : [...current, player]
    ));
  }, []);

  const removeSelectedPlayer = (player) => {
    setSelectedPlayers((current) => current.filter((selected) => !samePlayer(selected, player)));
  };

  const addRawName = () => {
    const displayName = normalizeName(rawName);
    if (!displayName) {
      return;
    }
    addSelectedPlayer({ displayName });
    setRawName('');
  };

  // The selected non-critic (raw) players, shown as removable chips above the input.
  const rawSelected = useMemo(
    () => selectedPlayers.filter((player) => !player.criticUserId && !player.playerId),
    [selectedPlayers]
  );

  const createTournament = async () => {
    const normalizedPoints = Number.parseInt(pointsToWin, 10);
    if (!Number.isFinite(normalizedPoints) || normalizedPoints < 1) {
      setError('Points to win must be at least 1.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      // Names aren't unique — every tournament is just "Tournament" and every match
      // "Matches" (the date/players differentiate rows in the list).
      const name = isMatch ? 'Matches' : 'Tournament';
      const normalizedCourts = Math.max(1, Number.parseInt(courtCount, 10) || 1);
      const tournament = await BackendApiService.createTourneyTournament({
        name,
        tournamentDate,
        mode,
        // A match is always one net; a tournament only sets nets when live.
        courtCount: isMatch ? 1 : (mode === 'LIVE' ? normalizedCourts : null),
        status: 'DRAFT',
        pointsToWin: normalizedPoints,
        isMatch
      });

      for (const [index, player] of selectedPlayers.entries()) {
        const playerId = await ensureTourneyPlayer(player);
        await BackendApiService.addTourneyTournamentPlayer(tournament.id, {
          playerId,
          seedNumber: index + 1,
          checkedIn: true
        });
      }

      emitTourneyChanged();
      notify({ message: `${isMatch ? 'Match' : 'Tournament'} created.`, type: 'info' });
      navigation.replace('TourneyDetail', { tournamentId: tournament.id });
    } catch (err) {
      const message = err.message || 'Failed to create tournament';
      setError(message);
      notify({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Tourney</Text>
        <Text style={styles.title}>{`${isHistorical ? 'Historical' : 'Live'} ${kindLabel}`}</Text>
      </View>
      <StatusMessage message={error} type="error" />

      <Card style={styles.section}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Sport</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: sportOpen }}
            onPress={() => setSportOpen((open) => !open)}
            style={styles.dropdown}
          >
            <Text style={styles.dropdownText}>{sportLabel}</Text>
            <Text style={styles.dropdownCaret}>{sportOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {sportOpen ? (
            <View style={styles.dropdownMenu}>
              {SPORTS.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option.value === sport }}
                  onPress={() => { setSport(option.value); setSportOpen(false); }}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    option.value === sport && styles.dropdownOptionActive,
                    pressed && styles.dropdownOptionPressed
                  ]}
                >
                  <Text style={[styles.dropdownOptionText, option.value === sport && styles.dropdownOptionTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {/* Live is always dated today; only historical back-fills pick a date. */}
        {isHistorical ? (
          <AppTextInput label="Date" value={tournamentDate} onChangeText={setTournamentDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        ) : null}

        <Text style={styles.hint}>
          {isHistorical
            ? `Back-fill a finished ${kindLabel}: enter the matchups and scores yourself.`
            : isMatch
              ? 'Start now on one net. Everyone begins benched — drag who is playing onto the net each game.'
              : 'Run round-by-round; pairings are auto-generated each round (drag to adjust).'}
        </Text>

        {/* Matches are always one net, so only tournaments choose a net count. */}
        {mode === 'LIVE' && !isMatch ? (
          <AppTextInput
            label="Nets (concurrent games)"
            value={courtCount}
            onChangeText={setCourtCount}
            keyboardType="number-pad"
            placeholder="1"
          />
        ) : null}

        <AppTextInput
          label="Points to win"
          value={pointsToWin}
          onChangeText={setPointsToWin}
          keyboardType="number-pad"
          placeholder="15"
        />
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Players</Text>
          <Text style={styles.count}>
            {selectedPlayers.length} selected{loadingUsers ? ' · loading' : ''}
          </Text>
        </View>

        {/* Virtualized: mounting every row at once also mounted every avatar at
            once, which is what made this screen a memory spike on mobile web. */}
        <FlatList
          style={styles.playerList}
          contentContainerStyle={styles.playerListContent}
          data={people}
          keyExtractor={(person) => person.key}
          extraData={selectedPlayers}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          initialNumToRender={10}
          windowSize={5}
          ListEmptyComponent={(
            <Text style={styles.muted}>{loadingUsers ? 'Loading players…' : 'No players found.'}</Text>
          )}
          renderItem={({ item: person }) => {
            const selected = isSelected(person.candidate);
            return (
              <Pressable
                onPress={() => (selected ? removeSelectedPlayer(person.candidate) : addSelectedPlayer(person.candidate))}
                style={({ pressed }) => [styles.playerRow, pressed && styles.playerRowPressed]}
              >
                <UserAvatar username={person.displayName} profilePicUrl={person.profilePicUrl} size="sm" />
                <View style={styles.playerCopy}>
                  <Text style={styles.playerName} numberOfLines={1}>{person.displayName}</Text>
                  {person.guest ? (
                    <Text style={styles.playerBadgeGuest}>Guest</Text>
                  ) : person.playedBefore ? (
                    <Text style={styles.playerBadge}>Played before</Text>
                  ) : null}
                </View>
                <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                  {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
              </Pressable>
            );
          }}
        />

        <View style={styles.rawBlock}>
          <Text style={styles.label}>Add someone not on Critic</Text>
          {rawSelected.length > 0 ? (
            <View style={styles.chips}>
              {rawSelected.map((player) => (
                <Pressable key={playerKey(player)} onPress={() => removeSelectedPlayer(player)} style={styles.chip}>
                  <Text style={styles.chipText}>{player.displayName}</Text>
                  <Text style={styles.chipRemove}>×</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.addRow}>
            <AppTextInput
              value={rawName}
              onChangeText={setRawName}
              placeholder="Player name"
              style={styles.addInput}
              onSubmitEditing={addRawName}
            />
            <AppButton label="Add" onPress={addRawName} variant="secondary" style={styles.addButton} />
          </View>
        </View>
      </Card>

      <AppButton label={`Create ${kindLabel}`} onPress={createTournament} loading={saving} />
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
  section: {
    gap: spacing.md
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  sectionTitle: text.h3,
  count: text.muted,
  fieldGroup: {
    gap: spacing.xs
  },
  label: {
    ...text.muted,
    color: colors.text,
    fontWeight: '600'
  },
  hint: {
    ...text.muted,
    fontSize: 12,
    lineHeight: 16
  },
  dropdown: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dropdownText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600'
  },
  dropdownCaret: {
    color: colors.textMuted,
    fontSize: 12
  },
  dropdownMenu: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden'
  },
  dropdownOption: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center'
  },
  dropdownOptionActive: {
    backgroundColor: colors.surfacePressed
  },
  dropdownOptionPressed: {
    backgroundColor: colors.surfaceMuted
  },
  dropdownOptionText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600'
  },
  dropdownOptionTextActive: {
    color: colors.text
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm
  },
  segmentActive: {
    backgroundColor: colors.surfacePressed
  },
  segmentText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 14
  },
  segmentTextActive: {
    color: colors.text
  },
  playerList: {
    maxHeight: 320,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft
  },
  playerListContent: {
    padding: spacing.xs
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm
  },
  playerRowPressed: {
    backgroundColor: colors.surfacePressed
  },
  playerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  playerName: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700'
  },
  playerBadge: {
    ...text.muted,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700'
  },
  playerBadgeGuest: {
    ...text.muted,
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700'
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
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
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18
  },
  rawBlock: {
    gap: spacing.sm
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted
  },
  chipText: {
    color: colors.text,
    fontWeight: '700'
  },
  chipRemove: {
    color: colors.textMuted,
    fontWeight: '900'
  },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'flex-end'
  },
  addInput: {
    flex: 1,
    minWidth: 190
  },
  addButton: {
    minWidth: 82
  },
  muted: {
    ...text.muted,
    padding: spacing.sm
  }
});

export default TourneyCreateScreen;
