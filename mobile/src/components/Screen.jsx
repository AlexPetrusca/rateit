import { useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, spacing, text } from '../theme.js';

const Screen = ({
  subtitle,
  children,
  actions,
  scroll = true,
  contentStyle,
  headerStyle,
  safeTop = false,
  safeBottom = true
}) => {
  const { width } = useWindowDimensions();
  const lastOffset = useRef(0);
  const compact = width < 375;
  const content = (
    <View style={[styles.content, compact && styles.compactContent, contentStyle]}>
      {(subtitle || actions) && (
        <View style={[styles.header, headerStyle]}>
          <View style={styles.headerText}>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
      )}
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={[...(safeTop ? ['top'] : []), 'left', 'right', ...(safeBottom ? ['bottom'] : [])]} style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          onScroll={({ nativeEvent }) => {
            const offset = nativeEvent.contentOffset.y;
            if (Platform.OS === 'web' && (offset <= 8 || Math.abs(offset - lastOffset.current) > 6)) {
              window.dispatchEvent(new CustomEvent('rateit-scroll-direction', {
                detail: offset <= 8 || offset < lastOffset.current ? 'up' : 'down'
              }));
            }
            lastOffset.current = offset;
          }}
          scrollEventThrottle={100}
        >
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  scroll: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg
  },
  compactContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md
  },
  header: {
    gap: spacing.md
  },
  headerText: {
    gap: spacing.xs
  },
  subtitle: text.muted,
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  }
});

export default Screen;
