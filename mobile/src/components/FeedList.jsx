import { useCallback, useRef } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  hasMore = false,
  emptyTitle = 'No items yet.',
  emptyMessage,
  endMessage,
  ListHeaderComponent,
  contentContainerStyle
}) => {
  const lastOffset = useRef(0);
  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;
  const detachRef = useRef(null);
  const lastEndReached = useRef(0);

  // Web-only pull-to-refresh, attached to THIS list's own scroll node (not
  // document) so it can't block scrolling on other screens. A non-passive
  // touchmove + preventDefault stops the browser hijacking the drag as a scroll;
  // a vertical drag down >60px while the feed is at the top triggers onRefresh.
  const listRef = useCallback((instance) => {
    if (detachRef.current) { detachRef.current(); detachRef.current = null; }
    if (Platform.OS !== 'web' || !onRefresh || !instance) return;
    const node = instance.getScrollableNode?.();
    if (!node) return;
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
    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: false });
    node.addEventListener('touchend', end, { passive: true });
    node.addEventListener('touchcancel', end, { passive: true });
    detachRef.current = () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', end);
      node.removeEventListener('touchcancel', end);
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

  const footer = (
    <View style={styles.footer}>
      {(loadingMore || hasMore) ? (
        <ActivityIndicator color={colors.accent} />
      ) : endMessage ? (
        <Text style={styles.message}>{endMessage}</Text>
      ) : null}
    </View>
  );

  // WEB: render a plain, non-virtualized native-scrolling list. The browser
  // scrolls over real DOM with zero per-frame JS, so a fast flick can never
  // outrun a windowed renderer and reveal blank (black) cells, and scrolling
  // back up never remounts. Cards are memoized, so appending a page only mounts
  // the new cards; images are small, so the growing DOM stays affordable.
  if (Platform.OS === 'web') {
    const onScroll = ({ nativeEvent }) => {
      const offset = nativeEvent.contentOffset.y;
      if (offset <= 8 || Math.abs(offset - lastOffset.current) > 6) {
        window.dispatchEvent(new CustomEvent('rateit-scroll-direction', {
          detail: offset <= 8 || offset < lastOffset.current ? 'up' : 'down'
        }));
      }
      lastOffset.current = offset;

      // Eager pagination: whenever we're within ~2 viewports of the end, ask for
      // the next page. The owning screen dedupes in-flight loads (loadingMoreRef)
      // and stops at the end (hasMore), so firing on each near-end scroll event
      // simply loads pages back-to-back until there are none left.
      const { layoutMeasurement, contentSize } = nativeEvent;
      const distanceToEnd = (contentSize?.height || 0) - (offset + layoutMeasurement.height);
      // Throttle so a fast flick past the bottom loads one page at a time (each
      // mounting only ~5 cards) instead of burst-loading several pages into one
      // big render. If the user outruns it they reach the footer spinner, never
      // blank space.
      const now = Date.now();
      if (distanceToEnd < layoutMeasurement.height * 2 && now - lastEndReached.current > 500) {
        lastEndReached.current = now;
        onEndReached?.();
      }
    };

    return (
      <View style={styles.container}>
        {refreshing ? (
          <View style={styles.refreshSpinner} pointerEvents="none">
            <View style={styles.refreshSpinnerBadge}>
              <ActivityIndicator color={colors.accent} />
            </View>
          </View>
        ) : null}
        <ScrollView
          ref={listRef}
          style={styles.flatList}
          contentContainerStyle={[styles.list, contentContainerStyle]}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {ListHeaderComponent}
          {items?.length ? items.map((item, index) => (
            <View key={keyExtractor(item)}>
              {index > 0 ? <View style={styles.separator} /> : null}
              {renderItem({ item, index })}
            </View>
          )) : <EmptyState title={emptyTitle} message={emptyMessage} />}
          {footer}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
    <FlatList
      ref={listRef}
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
      onEndReached={onEndReached}
      onEndReachedThreshold={2}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={<EmptyState title={emptyTitle} message={emptyMessage} />}
      ListFooterComponent={footer}
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
    minHeight: 160,
    alignItems: 'stretch',
    justifyContent: 'center'
  },
  message: {
    ...text.muted
  }
});

export default FeedList;
