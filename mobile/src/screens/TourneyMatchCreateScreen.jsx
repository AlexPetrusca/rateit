import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useTourneyPeople, normalizeName, playerKey, samePlayer } from '../hooks/useTourneyPeople.js';
import BackendApiService from '../services/BackendApiService.js';
import { emitTourneyChanged } from '../utils/liveTourneyEvents.js';
import { colors, radius, spacing, text } from '../theme.js';

const todayIsoDate = () => new Date().toISOString().slice(0, 10);
const STEPS = ['Who Played?', 'What was the score?', 'Match Details'];
const emptyGame = () => ({ a: '', b: '' });
const isFilled = (value) => value !== '' && Number.isFinite(Number(value));
const gameComplete = (game) => isFilled(game.a) && isFilled(game.b);

const TourneyMatchCreateScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const { people, loading, ensureTourneyPlayer } = useTourneyPeople();

  const meCandidate = useMemo(() => ({
    displayName: user?.username || 'You',
    criticUserId: user?.userId ?? user?.id,
    criticUsername: user?.username,
    profilePicUrl: user?.profilePicUrl
  }), [user]);

  const [step, setStep] = useState(0);
  const [team1, setTeam1] = useState([meCandidate]);
  const [team2, setTeam2] = useState([]);
  const [pickerTarget, setPickerTarget] = useState(null); // 1 | 2 | null
  const [rawName, setRawName] = useState('');
  const [pointsToWin, setPointsToWin] = useState('15');
  const [games, setGames] = useState([emptyGame()]);
  const [location, setLocation] = useState('');
  const [matchDate, setMatchDate] = useState(todayIsoDate());
  const [eventName, setEventName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allSelected = useMemo(() => [...team1, ...team2], [team1, team2]);
  const isChosen = (candidate) => allSelected.some((selected) => samePlayer(selected, candidate));

  const setTeam = (target, updater) => (target === 1 ? setTeam1(updater) : setTeam2(updater));

  const addToTeam = (candidate) => {
    if (isChosen(candidate)) {
      return;
    }
    const current = pickerTarget === 1 ? team1 : team2;
    if (current.length >= 2) {
      return;
    }
    setTeam(pickerTarget, (list) => [...list, candidate]);
  };

  const removeFromTeam = (target, candidate) => {
    setTeam(target, (list) => list.filter((selected) => !samePlayer(selected, candidate)));
  };

  const addRawToTeam = () => {
    const displayName = normalizeName(rawName);
    if (!displayName) {
      return;
    }
    addToTeam({ displayName });
    setRawName('');
  };

  const pw = Math.max(1, Number.parseInt(pointsToWin, 10) || 15);
  // A team "wins" a game once it reaches points-to-win; only one side can.
  const winnerOf = (game) => {
    const aWin = game.a !== '' && Number(game.a) >= pw;
    const bWin = game.b !== '' && Number(game.b) >= pw;
    if (aWin && !bWin) return 'a';
    if (bWin && !aWin) return 'b';
    return null;
  };

  const completeGames = useMemo(() => games.filter(gameComplete), [games]);
  const hasTie = completeGames.some((game) => Number(game.a) === Number(game.b));
  const teamsReady = team1.length === 2 && team2.length === 2;
  const scoresReady = completeGames.length >= 1 && !hasTie;

  // Auto-append another game once the last row is fully filled (DUPR-style).
  const withTrailingGame = (list) => {
    const last = list[list.length - 1];
    return last && gameComplete(last) ? [...list, emptyGame()] : list;
  };

  // Keystroke: just record the digits — no auto-fill yet, so typing "1" then "5"
  // for 15 isn't prematurely treated as a losing score.
  const changeGame = (index, side, value) => {
    const digits = value.replace(/[^0-9]/g, '');
    setError('');
    setGames((current) => withTrailingGame(current.map((game, i) => (i === index ? { ...game, [side]: digits } : game))));
  };

  // Blur: a finished losing score (below points-to-win) means the other team must
  // have won, so fill their score to points-to-win (mirrors the live scoreboard).
  const settleGame = (index, side) => {
    setGames((current) => {
      const game = current[index];
      if (!game) return current;
      const val = game[side];
      const other = side === 'a' ? 'b' : 'a';
      if (val === '' || val == null || Number(val) >= pw) return current;
      if (game[other] !== '' && game[other] != null) return current;
      return withTrailingGame(current.map((g, i) => (i === index ? { ...g, [other]: String(pw) } : g)));
    });
  };

  const goNext = () => {
    if (step === 0) {
      if (!teamsReady) {
        setError('Pick two players for each team.');
        return;
      }
    }
    if (step === 1) {
      if (!scoresReady) {
        setError(hasTie ? 'Each game needs a winner (no ties).' : 'Enter the score for at least one game.');
        return;
      }
    }
    setError('');
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = () => {
    if (step === 0) {
      navigation.goBack();
      return;
    }
    setError('');
    setStep((current) => current - 1);
  };

  const submit = async () => {
    if (!teamsReady) {
      setError('Pick two players for each team.');
      setStep(0);
      return;
    }
    if (!scoresReady) {
      setError(hasTie ? 'Each game needs a winner (no ties).' : 'Enter the score for at least one game.');
      setStep(1);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const [a1, a2] = await Promise.all(team1.map((player) => ensureTourneyPlayer(player)));
      const [b1, b2] = await Promise.all(team2.map((player) => ensureTourneyPlayer(player)));
      await BackendApiService.createTourneyMatch({
        tournamentDate: matchDate || todayIsoDate(),
        location: location.trim() || null,
        event: eventName.trim() || null,
        teamAPlayerIds: [a1, a2],
        teamBPlayerIds: [b1, b2],
        games: completeGames.map((game) => ({ teamAScore: Number(game.a), teamBScore: Number(game.b) }))
      });
      emitTourneyChanged();
      notify({ message: 'Match saved.', type: 'info' });
      navigation.goBack();
    } catch (err) {
      const message = err.message || 'Failed to save match';
      setError(message);
      notify({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <Screen safeTop>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={goBack} style={styles.topBarButton}>
          <Text style={styles.topBarIcon}>{step === 0 ? '×' : '‹'}</Text>
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>New Match</Text>
          <View style={styles.dots}>
            {STEPS.map((label, index) => (
              <View key={label} style={[styles.dot, index === step && styles.dotActive]} />
            ))}
          </View>
        </View>
        {isLastStep ? (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={submit} disabled={saving} style={styles.topBarButton}>
            <Text style={[styles.topBarAction, saving && styles.topBarActionDisabled]}>Submit</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={goNext} style={styles.topBarButton}>
            <Text style={styles.topBarAction}>Next ›</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.heading}>{STEPS[step]}</Text>
      <StatusMessage message={error} type="error" />

      {step === 0 ? (
        <>
          <Text style={styles.subtle}>If you played singles, this flow needs a partner on each side (doubles only for now).</Text>
          <TeamCard label="Team 1" members={team1} onAdd={() => setPickerTarget(1)} onRemove={(c) => removeFromTeam(1, c)} />
          <TeamCard label="Team 2" members={team2} onAdd={() => setPickerTarget(2)} onRemove={(c) => removeFromTeam(2, c)} />
          <Card style={styles.section}>
            <AppTextInput
              label="Points to win"
              value={pointsToWin}
              onChangeText={(value) => setPointsToWin(value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="15"
            />
          </Card>
        </>
      ) : null}

      {step === 1 ? (
        <>
          {games.map((game, index) => {
            const winner = winnerOf(game);
            const teamRow = (side, teamMembers, fallback) => {
              const isWinner = winner === side;
              return (
                <View style={styles.teamScoreRow}>
                  <Text style={[styles.teamScoreName, isWinner && styles.teamScoreNameWin]} numberOfLines={1}>
                    {teamLabel(teamMembers, fallback)}
                  </Text>
                  <TextInput
                    value={game[side]}
                    onChangeText={(value) => changeGame(index, side, value)}
                    onBlur={() => settleGame(index, side)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textSubtle}
                    style={[styles.scoreInput, isWinner && styles.scoreInputWin]}
                  />
                </View>
              );
            };
            return (
              <Card key={index} style={styles.gameCard}>
                <Text style={styles.gameLabel}>Game {index + 1}</Text>
                {teamRow('a', team1, 'Team 1')}
                {teamRow('b', team2, 'Team 2')}
              </Card>
            );
          })}
          <Text style={styles.hint}>Enter the losing team's score — the winner auto-fills to {pw} and highlights red.</Text>
        </>
      ) : null}

      {step === 2 ? (
        <Card style={styles.section}>
          <AppTextInput label="Location" value={location} onChangeText={setLocation} placeholder="Where did you play?" />
          <AppTextInput label="Date" value={matchDate} onChangeText={setMatchDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          <AppTextInput label="Event (optional)" value={eventName} onChangeText={setEventName} placeholder="Event name (if applicable)" />
          <AppButton label="Submit match" onPress={submit} loading={saving} />
        </Card>
      ) : null}

      <Modal animationType="fade" transparent visible={pickerTarget != null} onRequestClose={() => setPickerTarget(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerTarget(null)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>Add to Team {pickerTarget}</Text>
            <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent} keyboardShouldPersistTaps="handled">
              {people.length === 0 ? (
                <Text style={styles.subtle}>{loading ? 'Loading players…' : 'No players found.'}</Text>
              ) : people.map((person) => {
                const chosen = isChosen(person.candidate);
                return (
                  <Pressable
                    key={person.key}
                    onPress={() => addToTeam(person.candidate)}
                    style={({ pressed }) => [styles.playerRow, pressed && styles.playerRowPressed]}
                  >
                    <UserAvatar username={person.displayName} profilePicUrl={person.profilePicUrl} size="sm" />
                    <View style={styles.playerCopy}>
                      <Text style={styles.playerName} numberOfLines={1}>{person.displayName}</Text>
                      {person.guest ? <Text style={styles.playerBadgeGuest}>Guest</Text> : null}
                    </View>
                    <View style={[styles.checkbox, chosen && styles.checkboxOn]}>
                      {chosen ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.addRow}>
              <AppTextInput value={rawName} onChangeText={setRawName} placeholder="Add someone not on Critic" style={styles.addInput} onSubmitEditing={addRawToTeam} />
              <AppButton label="Add" onPress={addRawToTeam} variant="secondary" style={styles.addButton} />
            </View>
            <AppButton label="Done" onPress={() => setPickerTarget(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
};

const teamLabel = (members, fallback) => (
  members.length === 0 ? fallback : members.map((m) => m.displayName).join(' & ')
);

const TeamCard = ({ label, members, onAdd, onRemove }) => (
  <Card style={styles.section}>
    <Text style={styles.teamLabel}>{label}</Text>
    {members.map((member) => (
      <View key={playerKey(member)} style={styles.memberRow}>
        <UserAvatar username={member.displayName} profilePicUrl={member.profilePicUrl} size="sm" />
        <Text style={styles.memberName} numberOfLines={1}>{member.displayName}</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onRemove(member)} style={styles.memberRemove}>
          <Text style={styles.memberRemoveText}>×</Text>
        </Pressable>
      </View>
    ))}
    {members.length < 2 ? (
      <Pressable accessibilityRole="button" onPress={onAdd} style={({ pressed }) => [styles.addMember, pressed && styles.addMemberPressed]}>
        <Text style={styles.addMemberText}>+ Add member</Text>
      </Pressable>
    ) : null}
  </Card>
);

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  topBarButton: {
    minWidth: 64,
    minHeight: 40,
    justifyContent: 'center'
  },
  topBarIcon: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '600'
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 6
  },
  topBarTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800'
  },
  dots: {
    flexDirection: 'row',
    gap: 6
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderStrong
  },
  dotActive: {
    backgroundColor: colors.accent
  },
  topBarAction: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right'
  },
  topBarActionDisabled: {
    opacity: 0.5
  },
  heading: {
    ...text.h1,
    marginTop: spacing.sm
  },
  subtle: {
    ...text.muted,
    fontSize: 13,
    lineHeight: 18
  },
  hint: {
    ...text.muted,
    fontSize: 12,
    lineHeight: 16
  },
  section: {
    gap: spacing.md
  },
  teamLabel: {
    ...text.muted,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '800'
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  memberName: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700'
  },
  memberRemove: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted
  },
  memberRemoveText: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20
  },
  addMember: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceSoft
  },
  addMemberPressed: {
    backgroundColor: colors.surfacePressed
  },
  addMemberText: {
    color: colors.textMuted,
    fontWeight: '700'
  },
  gameCard: {
    gap: spacing.sm
  },
  gameLabel: {
    ...text.muted,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: spacing.xs
  },
  teamScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  teamScoreName: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700'
  },
  teamScoreNameWin: {
    color: colors.accent
  },
  scoreInput: {
    width: 96,
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800'
  },
  scoreInputWin: {
    color: colors.accent,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  sheet: {
    gap: spacing.md,
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
    fontWeight: '800'
  },
  pickerList: {
    maxHeight: 320,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft
  },
  pickerListContent: {
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
  }
});

export default TourneyMatchCreateScreen;
