import { useEffect, useRef } from 'react';
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

  // Web-only pull-to-refresh. Standalone PWAs have no browser pull-to-refresh and
  // RN-web's RefreshControl ignores the gesture. Use a non-passive touchmove so we
  // can preventDefault and stop the browser hijacking the drag as a scroll; a
  // vertical drag down >60px while the feed is at the top triggers onRefresh.
  useEffect(() => {
    if (Platform.OS !== 'web' || !onRefresh || typeof document === 'undefined') return;
    let startY = null;
    let startX = 0;
    const onStart = (e) => {
      if (lastOffset.current <= 4) {
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
      } else {
        startY = null;
      }
    };
    const onMove = (e) => {
      if (startY == null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      // Only engage on a downward, vertically-dominant pull at the top (so it
      // doesn't fight horizontal scrolls like the story bar).
      if (lastOffset.current <= 4 && dy > 0 && dy > Math.abs(dx)) {
        if (e.cancelable) e.preventDefault();
        if (dy > 60) {
          startY = null;
          onRefresh();
        }
      }
    };
    const end = () => { startY = null; };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', end, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
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
    <View style={styles.container}>
    {Platform.OS === 'web' && refreshing ? (
      <View style={styles.refreshSpinner} pointerEvents="none">
        <View style={styles.refreshSpinnerBadge}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </View>
    ) : null}
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
  container: {
    flex: 1
  },
  refreshSpinner: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10
  },
  refreshSpinnerBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)'
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
