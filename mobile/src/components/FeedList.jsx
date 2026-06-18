import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import EmptyState from './EmptyState.jsx';
import { colors, spacing, text } from '../theme.js';

const FeedList = ({
  items,
  renderItem,
  keyExtractor = (item) => String(item.ratingId || item.id),
  loading = false,
  loadingMore = false,
  refreshing = false,
  onRefresh,
  onEndReached,
  emptyTitle = 'No items yet.',
  emptyMessage,
  endMessage,
  ListHeaderComponent
}) => {
  if (loading && !items?.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.message}>Loading...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={<EmptyState title={emptyTitle} message={emptyMessage} />}
      ListFooterComponent={(
        <View style={styles.footer}>
          {loadingMore ? <ActivityIndicator color={colors.accent} /> : null}
          {!loadingMore && endMessage ? <Text style={styles.message}>{endMessage}</Text> : null}
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1
  },
  separator: {
    height: spacing.md
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm
  },
  footer: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  message: {
    ...text.muted
  }
});

export default FeedList;
