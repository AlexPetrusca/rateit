import { useCallback, useRef } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
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
  ListHeaderComponent,
  ListFooterExtra,
  contentContainerStyle
}) => {
  const lastOffset = useRef(0);
  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;
  const detachRef = useRef(null);

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
      onScroll={({ nativeEvent }) => {
        const offset = nativeEvent.contentOffset.y;
        if (Platform.OS === 'web' && (offset <= 8 || Math.abs(offset - lastOffset.current) > 6)) {
          window.dispatchEvent(new CustomEvent('rateit-scroll-direction', {
            detail: offset <= 8 || offset < lastOffset.current ? 'up' : 'down'
          }));
        }
        lastOffset.current = offset;
      }}
      // Drive virtualization at ~60fps. On web the rendered window is recomputed
      // from scroll events, so a coarse throttle (e.g. 200ms) lets fast scrolling
      // outrun the renderer and reveal blank (black) cells before catching up in
      // one heavy batch (the freeze).
      scrollEventThrottle={16}
      // Prefetch the next page ~2 viewports before the end so a fast flick never
      // outruns pagination. Uses the virtualization layer (not throttled pixel
      // math), so it fires reliably even at high scroll speed.
      onEndReached={onEndReached}
      onEndReachedThreshold={2}
      // Render a generous buffer ahead/behind so fast scrolling doesn't outrun
      // the renderer and reveal blank cells.
      windowSize={11}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
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
