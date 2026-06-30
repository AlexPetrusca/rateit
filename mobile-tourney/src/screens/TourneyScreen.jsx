import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext.jsx';
import TourneyApiService from '../services/TourneyApiService.js';
import { colors, radius, spacing } from '../theme.js';

const emptyTournament = {
  name: '',
  location: '',
  tournamentDate: '',
  status: 'DRAFT',
  notes: ''
};

const emptyTeam = {
  name: '',
  playerOne: '',
  playerTwo: '',
  seedNumber: ''
};

const statusOptions = ['DRAFT', 'ACTIVE', 'COMPLETE'];
const statusLabel = (status) => ({ DRAFT: 'Draft', ACTIVE: 'Active', COMPLETE: 'Complete' }[status] || status);
const dateInput = (value) => value ? value.slice(0, 10) : '';

const TourneyScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentForm, setTournamentForm] = useState(emptyTournament);
  const [teamForm, setTeamForm] = useState(emptyTeam);
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTournament = useCallback(async (tournamentId) => {
    const detail = await TourneyApiService.getTournament(tournamentId);
    setSelectedTournament(detail);
    setTournamentForm({
      name: detail.name || '',
      location: detail.location || '',
      tournamentDate: dateInput(detail.tournamentDate),
      status: detail.status || 'DRAFT',
      notes: detail.notes || ''
    });
    setScoreDrafts(Object.fromEntries((detail.matches || []).map((match) => [
      match.id,
      {
        teamAScore: match.teamAScore == null ? '' : String(match.teamAScore),
        teamBScore: match.teamBScore == null ? '' : String(match.teamBScore),
        court: match.court || ''
      }
    ])));
    return detail;
  }, []);

  const loadTournaments = useCallback(async (preferredTournamentId = selectedId) => {
    setError('');
    setIsLoading(true);
    try {
      const data = await TourneyApiService.listTournaments();
      setTournaments(data);
      const preferredExists = data.some((tournament) => tournament.id === preferredTournamentId);
      const nextId = preferredExists ? preferredTournamentId : data[0]?.id || null;
      setSelectedId(nextId);
      if (nextId) {
        await loadTournament(nextId);
      } else {
        setSelectedTournament(null);
        setTournamentForm(emptyTournament);
        setScoreDrafts({});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [loadTournament, selectedId]);

  useEffect(() => {
    loadTournaments();
  }, []);

  const completedMatches = useMemo(
    () => selectedTournament?.matches?.filter((match) => match.completed).length || 0,
    [selectedTournament]
  );

  const setTournamentField = (field, value) => {
    setTournamentForm((form) => ({ ...form, [field]: value }));
  };

  const setTeamField = (field, value) => {
    setTeamForm((form) => ({ ...form, [field]: value }));
  };

  const selectTournament = async (tournamentId) => {
    setError('');
    setSelectedId(tournamentId);
    setIsLoading(true);
    try {
      await loadTournament(tournamentId);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const newTournament = () => {
    setSelectedId(null);
    setSelectedTournament(null);
    setTournamentForm(emptyTournament);
    setTeamForm(emptyTeam);
    setScoreDrafts({});
    setError('');
  };

  const saveTournament = async () => {
    if (!tournamentForm.name.trim()) {
      setError('Tournament name is required');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      const payload = {
        ...tournamentForm,
        tournamentDate: tournamentForm.tournamentDate || null,
        location: tournamentForm.location || null,
        notes: tournamentForm.notes || null
      };
      const saved = selectedTournament
        ? await TourneyApiService.updateTournament(selectedTournament.id, payload)
        : await TourneyApiService.createTournament(payload);
      setSelectedId(saved.id);
      setSelectedTournament(saved);
      await loadTournaments(saved.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const addTeam = async () => {
    if (!selectedTournament || !teamForm.name.trim()) return;
    setError('');
    setIsSaving(true);
    try {
      const updated = await TourneyApiService.addTeam(selectedTournament.id, {
        ...teamForm,
        seedNumber: teamForm.seedNumber === '' ? null : Number(teamForm.seedNumber)
      });
      setSelectedTournament(updated);
      setTeamForm(emptyTeam);
      await loadTournaments(updated.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTeam = async (team) => {
    const doDelete = async () => {
      setError('');
      try {
        const updated = await TourneyApiService.deleteTeam(selectedTournament.id, team.id);
        setSelectedTournament(updated);
        await loadTournaments(updated.id);
      } catch (err) {
        setError(err.message);
      }
    };

    if (Platform.OS === 'web') {
      doDelete();
      return;
    }

    Alert.alert('Delete team?', team.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete }
    ]);
  };

  const generateSchedule = async () => {
    if (!selectedTournament) return;
    setError('');
    setIsSaving(true);
    try {
      const updated = await TourneyApiService.generateSchedule(selectedTournament.id);
      setSelectedTournament(updated);
      await loadTournament(updated.id);
      await loadTournaments(updated.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const setScoreDraft = (matchId, field, value) => {
    setScoreDrafts((drafts) => ({
      ...drafts,
      [matchId]: {
        ...(drafts[matchId] || {}),
        [field]: value
      }
    }));
  };

  const saveScore = async (matchId) => {
    const draft = scoreDrafts[matchId] || {};
    setError('');
    setIsSaving(true);
    try {
      const updated = await TourneyApiService.updateMatchScore(selectedTournament.id, matchId, {
        teamAScore: draft.teamAScore === '' ? null : Number(draft.teamAScore),
        teamBScore: draft.teamBScore === '' ? null : Number(draft.teamBScore),
        court: draft.court || null
      });
      setSelectedTournament(updated);
      await loadTournament(updated.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Tourney</Text>
          <Text style={styles.title}>{selectedTournament?.name || 'New tournament'}</Text>
          <Text style={styles.userLine}>{user?.username ? `@${user.username}` : 'Spikeball tournament control'}</Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tournamentStrip}
      >
        <Pressable style={[styles.tournamentChip, !selectedId && styles.tournamentChipActive]} onPress={newTournament}>
          <Text style={[styles.tournamentChipText, !selectedId && styles.tournamentChipTextActive]}>New</Text>
        </Pressable>
        {tournaments.map((tournament) => (
          <Pressable
            key={tournament.id}
            style={[styles.tournamentChip, selectedId === tournament.id && styles.tournamentChipActive]}
            onPress={() => selectTournament(tournament.id)}
          >
            <Text style={[styles.tournamentChipText, selectedId === tournament.id && styles.tournamentChipTextActive]}>
              {tournament.name}
            </Text>
            <Text style={styles.tournamentChipMeta}>{statusLabel(tournament.status)} · {tournament.teamCount}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => loadTournaments(selectedId)} tintColor={colors.accent} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Details</Text>
            <Pressable style={styles.primaryButton} onPress={saveTournament} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save</Text>}
            </Pressable>
          </View>
          <Field label="Name" value={tournamentForm.name} onChangeText={(value) => setTournamentField('name', value)} placeholder="Summer Spike Series" />
          <Field label="Date" value={tournamentForm.tournamentDate} onChangeText={(value) => setTournamentField('tournamentDate', value)} placeholder="2026-07-18" />
          <Field label="Location" value={tournamentForm.location} onChangeText={(value) => setTournamentField('location', value)} placeholder="Golden Gate Park" />
          <Text style={styles.label}>Status</Text>
          <View style={styles.segmented}>
            {statusOptions.map((status) => (
              <Pressable
                key={status}
                style={[styles.segment, tournamentForm.status === status && styles.segmentActive]}
                onPress={() => setTournamentField('status', status)}
              >
                <Text style={[styles.segmentText, tournamentForm.status === status && styles.segmentTextActive]}>
                  {statusLabel(status)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field label="Notes" value={tournamentForm.notes} onChangeText={(value) => setTournamentField('notes', value)} placeholder="Check-in, format, prize notes" multiline />
        </View>

        {selectedTournament ? (
          <>
            <View style={styles.statsRow}>
              <Stat label="Teams" value={selectedTournament.teamCount || 0} />
              <Stat label="Matches" value={selectedTournament.matchCount || 0} />
              <Stat label="Finals" value={completedMatches} />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Teams</Text>
                <Pressable style={styles.secondaryButton} onPress={addTeam} disabled={isSaving}>
                  <Text style={styles.secondaryButtonText}>Add</Text>
                </Pressable>
              </View>
              <Field label="Team name" value={teamForm.name} onChangeText={(value) => setTeamField('name', value)} placeholder="Backhanded Compliments" />
              <View style={styles.twoColumn}>
                <Field label="Player 1" value={teamForm.playerOne} onChangeText={(value) => setTeamField('playerOne', value)} placeholder="Alex" />
                <Field label="Player 2" value={teamForm.playerTwo} onChangeText={(value) => setTeamField('playerTwo', value)} placeholder="Sam" />
              </View>
              <Field label="Seed" value={teamForm.seedNumber} onChangeText={(value) => setTeamField('seedNumber', value)} placeholder="1" keyboardType="number-pad" />
              {(selectedTournament.teams || []).map((team) => (
                <View style={styles.teamRow} key={team.id}>
                  <View style={styles.seedBadge}><Text style={styles.seedText}>{team.seedNumber || '-'}</Text></View>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{team.name}</Text>
                    <Text style={styles.rowMeta}>{[team.playerOne, team.playerTwo].filter(Boolean).join(' / ') || 'Players TBD'}</Text>
                  </View>
                  <Pressable style={styles.deleteButton} onPress={() => deleteTeam(team)}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Standings</Text>
                <Pressable
                  style={[styles.secondaryButton, (selectedTournament.teamCount || 0) < 2 && styles.disabledButton]}
                  onPress={generateSchedule}
                  disabled={(selectedTournament.teamCount || 0) < 2 || isSaving}
                >
                  <Text style={styles.secondaryButtonText}>Round robin</Text>
                </Pressable>
              </View>
              <View style={styles.standingsHeader}>
                <Text style={styles.standingsTeam}>Team</Text>
                <Text style={styles.standingCell}>W</Text>
                <Text style={styles.standingCell}>L</Text>
                <Text style={styles.standingCell}>+/-</Text>
                <Text style={styles.standingCell}>PF</Text>
              </View>
              {(selectedTournament.standings || []).map((standing) => (
                <View style={styles.standingsRow} key={standing.teamId}>
                  <Text style={styles.standingsTeam}>{standing.teamName}</Text>
                  <Text style={styles.standingCell}>{standing.wins}</Text>
                  <Text style={styles.standingCell}>{standing.losses}</Text>
                  <Text style={styles.standingCell}>{standing.pointDifferential}</Text>
                  <Text style={styles.standingCell}>{standing.pointsFor}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Matches</Text>
              {(selectedTournament.matches || []).map((match) => {
                const draft = scoreDrafts[match.id] || {};
                return (
                  <View style={[styles.matchCard, match.completed && styles.matchCardComplete]} key={match.id}>
                    <View style={styles.matchMetaRow}>
                      <Text style={styles.roundText}>{match.roundName}</Text>
                      <TextInput
                        value={draft.court || ''}
                        onChangeText={(value) => setScoreDraft(match.id, 'court', value)}
                        placeholder="Court"
                        placeholderTextColor={colors.textSubtle}
                        style={styles.courtInput}
                      />
                    </View>
                    <ScoreLine
                      name={match.teamAName}
                      value={draft.teamAScore ?? ''}
                      onChangeText={(value) => setScoreDraft(match.id, 'teamAScore', value)}
                    />
                    <ScoreLine
                      name={match.teamBName}
                      value={draft.teamBScore ?? ''}
                      onChangeText={(value) => setScoreDraft(match.id, 'teamBScore', value)}
                    />
                    <Pressable style={styles.scoreButton} onPress={() => saveScore(match.id)} disabled={isSaving}>
                      <Text style={styles.scoreButtonText}>Save score</Text>
                    </Pressable>
                  </View>
                );
              })}
              {selectedTournament.matchCount === 0 ? (
                <Text style={styles.emptyText}>Add at least two teams, then generate a round robin.</Text>
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>Save a tournament to add teams and matches.</Text>
        )}
      </ScrollView>
    </View>
  );
};

const Field = ({ label, multiline = false, ...props }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={colors.textSubtle}
      style={[styles.input, multiline && styles.textarea]}
    />
  </View>
);

const Stat = ({ label, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ScoreLine = ({ name, value, onChangeText }) => (
  <View style={styles.scoreLine}>
    <Text style={styles.scoreTeam}>{name}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType="number-pad"
      placeholder="0"
      placeholderTextColor={colors.textSubtle}
      style={styles.scoreInput}
    />
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  title: {
    maxWidth: 260,
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900'
  },
  userLine: {
    color: colors.textMuted,
    marginTop: spacing.xs
  },
  logoutButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  logoutText: {
    color: colors.textMuted,
    fontWeight: '800'
  },
  tournamentStrip: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md
  },
  tournamentChip: {
    minWidth: 118,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  tournamentChipActive: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.accentSoft
  },
  tournamentChipText: {
    color: colors.text,
    fontWeight: '900'
  },
  tournamentChipTextActive: {
    color: colors.accent
  },
  tournamentChipMeta: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 12
  },
  body: {
    flex: 1
  },
  bodyContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900'
  },
  field: {
    gap: spacing.xs
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  input: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 16
  },
  textarea: {
    minHeight: 86,
    paddingTop: spacing.md,
    textAlignVertical: 'top'
  },
  primaryButton: {
    minHeight: 40,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.accent
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '900'
  },
  secondaryButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft
  },
  secondaryButtonText: {
    color: colors.accent,
    fontWeight: '900'
  },
  disabledButton: {
    opacity: 0.5
  },
  segmented: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background
  },
  segmentActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  segmentText: {
    color: colors.textMuted,
    fontWeight: '800'
  },
  segmentTextActive: {
    color: '#fff'
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md
  },
  stat: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface
  },
  statValue: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900'
  },
  statLabel: {
    color: colors.textMuted,
    fontWeight: '700'
  },
  twoColumn: {
    flexDirection: 'row',
    gap: spacing.md
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background
  },
  seedBadge: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft
  },
  seedText: {
    color: colors.accent,
    fontWeight: '900'
  },
  rowMain: {
    flex: 1
  },
  rowTitle: {
    color: colors.text,
    fontWeight: '900'
  },
  rowMeta: {
    color: colors.textMuted,
    marginTop: 2
  },
  deleteButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: '900'
  },
  standingsBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  standingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  standingsTeam: {
    flex: 1,
    color: colors.text,
    fontWeight: '900'
  },
  standingCell: {
    width: 34,
    color: colors.textMuted,
    textAlign: 'right',
    fontWeight: '800'
  },
  matchCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background
  },
  matchCardComplete: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.accentSoft
  },
  matchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  roundText: {
    color: colors.textMuted,
    fontWeight: '900'
  },
  courtInput: {
    width: 110,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.text
  },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  scoreTeam: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900'
  },
  scoreInput: {
    width: 74,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900'
  },
  scoreButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface
  },
  scoreButtonText: {
    color: colors.accent,
    fontWeight: '900'
  },
  emptyText: {
    color: colors.textMuted,
    lineHeight: 21
  },
  error: {
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontWeight: '700'
  }
});

export default TourneyScreen;
