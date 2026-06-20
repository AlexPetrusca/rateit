import { useRef } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import EmptyState from './EmptyState.jsx';
import { colors, spacing, text } from '../theme.js';
import { isNearListEnd } from '../utils/lists.js';

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
  ListHeaderComponent,
  ListFooterExtra,
  contentContainerStyle
}) => {
  const lastOffset = useRef(0);

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
      style={styles.flatList}
      contentContainerStyle={[styles.list, contentContainerStyle]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={onRefresh ? (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surfaceElevated}
        />
      ) : undefined}
      onScroll={({ nativeEvent }) => {
        const offset = nativeEvent.contentOffset.y;
        if (Platform.OS === 'web' && (offset <= 8 || Math.abs(offset - lastOffset.current) > 6)) {
          window.dispatchEvent(new CustomEvent('rateit-scroll-direction', {
            detail: offset <= 8 || offset < lastOffset.current ? 'up' : 'down'
          }));
        }
        lastOffset.current = offset;

        if (onEndReached && isNearListEnd({
          visibleLength: nativeEvent.layoutMeasurement.height,
          offset: nativeEvent.contentOffset.y,
          contentLength: nativeEvent.contentSize.height
        })) {
          onEndReached();
        }
      }}
      scrollEventThrottle={200}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={<EmptyState title={emptyTitle} message={emptyMessage} />}
      ListFooterComponent={(
        <View style={styles.footer}>
          {ListFooterExtra}
          {!loadingMore && endMessage ? <Text style={styles.message}>{endMessage}</Text> : null}
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  flatList: {
    flex: 1
  },
  list: {
    paddingBottom: spacing.xl,
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
    minHeight: 64,
    alignItems: 'stretch',
    justifyContent: 'center'
  },
  message: {
    ...text.muted
  }
});

export default FeedList;
