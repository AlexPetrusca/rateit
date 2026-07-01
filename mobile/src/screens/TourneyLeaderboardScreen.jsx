import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { colors, radius, spacing, text } from '../theme.js';

const SORT_DIRECTIONS = {
  rank: 'asc',
  playerName: 'asc',
  elo: 'desc',
  wins: 'desc'
};

const getColumnDefs = (compact) => (
  compact
    ? [
        { key: 'rank', label: '', width: 34, align: 'center', sortable: false },
        { key: 'playerName', label: 'Player', flex: 1, minWidth: 104, align: 'left', sortable: true },
        { key: 'elo', label: 'ELO', width: 46, align: 'right', sortable: true },
        { key: 'wins', label: 'Wins', width: 44, align: 'right', sortable: true }
      ]
    : [
        { key: 'rank', label: '', width: 64, align: 'center', sortable: false },
        { key: 'playerName', label: 'Player', width: 190, flex: 1, align: 'left', sortable: true },
        { key: 'elo', label: 'ELO', width: 84, align: 'right', sortable: true },
        { key: 'wins', label: 'Wins', width: 92, align: 'right', sortable: true }
      ]
);

const compareValues = (left, right, key, direction) => {
  let result = 0;
  if (key === 'playerName') {
    result = String(left[key] || '').localeCompare(String(right[key] || ''), undefined, { sensitivity: 'base' });
  } else {
    const leftValue = Number(left[key] ?? Number.NEGATIVE_INFINITY);
    const rightValue = Number(right[key] ?? Number.NEGATIVE_INFINITY);
    result = leftValue - rightValue;
  }
  return direction === 'asc' ? result : -result;
};

const LeaderboardHeaderCell = ({ column, sortKey, onPress, compact }) => {
  const isActive = sortKey === column.key;
  const isLeft = column.align === 'left';
  const isCenter = column.align === 'center';

  return (
    <Pressable
      onPress={() => onPress(column.key)}
      style={[
        styles.headerCell,
        column.key === 'playerName' && styles.playerHeaderCell,
        isLeft && styles.headerCellLeft,
        isCenter && styles.headerCellCenter,
        compact && styles.headerCellCompact,
        {
          width: column.width,
          minWidth: column.minWidth,
          flexGrow: column.flex ? 1 : 0,
          flexShrink: column.flex ? 1 : 0,
          flexBasis: column.flex ? 0 : 'auto'
        }
      ]}
    >
      <Text
        style={[
          styles.headerLabel,
          compact && styles.headerLabelCompact,
          isLeft && styles.headerLabelLeft,
          isCenter && styles.headerLabelCenter,
          !isLeft && !isCenter && styles.headerLabelRight,
          isActive && styles.headerLabelActive
        ]}
        numberOfLines={1}
      >
        {column.label}
      </Text>
    </Pressable>
  );
};

const LeaderboardRow = ({ row, columnDefs, compact, displayRank }) => (
  <View style={styles.row}>
    <View style={[styles.cell, styles.rankCell, compact && styles.cellCompact, { width: columnDefs[0].width }]}>
      <Text style={[styles.rankText, compact && styles.rankTextCompact]}>{displayRank}</Text>
    </View>
    <View style={[styles.cell, styles.playerCell, compact && styles.cellCompact, { width: columnDefs[1].width, flex: columnDefs[1].flex, minWidth: columnDefs[1].minWidth }]}>
      <UserAvatar username={row.playerName} profilePicUrl={row.profilePicUrl} size={compact ? 24 : 28} />
      <Text style={[styles.playerText, compact && styles.playerTextCompact]} numberOfLines={1}>{row.playerName}</Text>
    </View>
    <View style={[styles.cell, styles.numericCell, compact && styles.cellCompact, { width: columnDefs[2].width }]}>
      <Text style={[styles.numericText, compact && styles.numericTextCompact]}>{Math.round(Number(row.elo ?? 1000))}</Text>
    </View>
    <View style={[styles.cell, styles.numericCell, compact && styles.cellCompact, { width: columnDefs[3].width }]}>
      <Text style={[styles.numericText, compact && styles.numericTextCompact]}>{row.wins}</Text>
    </View>
  </View>
);

const TourneyLeaderboardScreen = () => {
  const { notify } = useNotifications();
  const { width } = useWindowDimensions();
  const compact = width < 440;
  const columnDefs = useMemo(() => getColumnDefs(compact), [compact]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState({ key: 'elo', direction: 'desc' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextRows = await BackendApiService.getTourneyLeaderboard();
      setRows(nextRows || []);
    } catch (err) {
      notify({ message: err.message || 'Failed to load leaderboard', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visibleRows = useMemo(() => {
    const nextRows = rows.map((row, index) => ({ ...row, __originalIndex: index }));
    nextRows.sort((left, right) => {
      const base = compareValues(left, right, sort.key, sort.direction);
      if (base !== 0) return base;
      return left.__originalIndex - right.__originalIndex;
    });
    return nextRows.map(({ __originalIndex, ...row }) => row);
  }, [rows, sort]);

  const handleSort = useCallback((key) => {
    if (key === 'rank') return;
    setSort((current) => (
      current.key === key
        ? { ...current, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: SORT_DIRECTIONS[key] || 'asc' }
    ));
  }, []);

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Tourney</Text>
        <Text style={styles.title}>Leaderboard</Text>
      </View>

      <Card style={styles.card}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No leaderboard yet</Text>
            <Text style={styles.emptyBody}>Once tournaments have players and completed games, the rankings will appear here.</Text>
          </View>
        ) : (
          <ScrollView horizontal={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableScroll}>
            <View style={styles.table}>
              <View style={styles.headerRow}>
                {columnDefs.map((column) => (
                  <LeaderboardHeaderCell
                    key={column.key}
                    column={column}
                    sortKey={sort.key}
                    onPress={handleSort}
                    compact={compact}
                  />
                ))}
              </View>
              {visibleRows.map((row, index) => (
                <View key={row.playerId ?? `${row.playerName}-${index}`} style={[styles.rowWrap, index % 2 === 1 && styles.rowWrapAlt]}>
                  <LeaderboardRow row={row} columnDefs={columnDefs} compact={compact} displayRank={index + 1} />
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl + 72
  },
  header: {
    gap: spacing.xs
  },
  eyebrow: {
    ...text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '800',
    color: colors.textSubtle
  },
  title: {
    ...text.h1,
    letterSpacing: 0
  },
  card: {
    padding: spacing.md,
    gap: spacing.sm
  },
  loading: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center'
  },
  empty: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm
  },
  emptyTitle: {
    ...text.h3,
    textAlign: 'center'
  },
  emptyBody: {
    ...text.muted,
    textAlign: 'center'
  },
  tableScroll: {
    flexGrow: 1
  },
  table: {
    width: '100%'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong
  },
  headerCell: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  headerCellLeft: {
    alignItems: 'flex-start'
  },
  headerCellCenter: {
    alignItems: 'center'
  },
  headerCellCompact: {
    paddingHorizontal: 2,
    paddingRight: 2
  },
  playerHeaderCell: {
    flexShrink: 1
  },
  headerLabel: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800'
  },
  headerLabelCompact: {
    fontSize: 11,
    lineHeight: 13
  },
  headerLabelLeft: {
    alignSelf: 'flex-start',
    textAlign: 'left'
  },
  headerLabelCenter: {
    alignSelf: 'center',
    textAlign: 'center'
  },
  headerLabelRight: {
    alignSelf: 'flex-end',
    textAlign: 'right'
  },
  headerLabelActive: {
    color: colors.text
  },
  rowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  rowWrapAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46
  },
  cellCompact: {
    paddingRight: 4,
    paddingVertical: spacing.xs
  },
  cell: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.xs,
    justifyContent: 'center'
  },
  rankCell: {
    alignItems: 'flex-start'
  },
  playerCell: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xs
  },
  numericCell: {
    alignItems: 'flex-end'
  },
  rankText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums']
  },
  rankTextCompact: {
    fontSize: 12,
    lineHeight: 15
  },
  playerText: {
    flexShrink: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700'
  },
  playerTextCompact: {
    fontSize: 13,
    lineHeight: 16
  },
  numericText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    fontVariant: ['tabular-nums']
  },
  numericTextCompact: {
    fontSize: 12,
    lineHeight: 15
  }
});

export default TourneyLeaderboardScreen;
