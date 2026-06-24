import { useCallback, useRef } from 'react';
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
  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;
  const detachRef = useRef(null);

  // Web-only pull-to-refresh. Standalone PWAs have no browser pull-to-refresh and
  // RN-web's RefreshControl ignores the touch gesture, so wire it up by hand:
  // a downward drag of >70px while scrolled at the top triggers onRefresh.
  const pullToRefreshRef = useCallback((node) => {
    if (detachRef.current) { detachRef.current(); detachRef.current = null; }
    if (Platform.OS !== 'web' || !onRefresh || !node) return;
    let startY = null;
    const onStart = (e) => { startY = lastOffset.current <= 4 ? e.touches[0].clientY : null; };
    const onMove = (e) => {
      if (startY == null || refreshingRef.current) return;
      if (lastOffset.current <= 4 && e.touches[0].clientY - startY > 70) {
        startY = null;
        onRefresh();
      }
    };
    const clear = () => { startY = null; };
    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: true });
    node.addEventListener('touchend', clear, { passive: true });
    node.addEventListener('touchcancel', clear, { passive: true });
    detachRef.current = () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', clear);
      node.removeEventListener('touchcancel', clear);
    };
  }, [onRefresh]);

  if (loading && !items?.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.message}>Loading...</Text>
      </View>
    );
  }

  return (
    <View ref={pullToRefreshRef} style={styles.wrapper}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1
  },
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
