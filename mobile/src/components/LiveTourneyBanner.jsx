import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import BackendApiService from '../services/BackendApiService.js';
import { colors } from '../theme.js';

const POLL_MS = 30000;
// Enough repeats that one segment is always wider than the viewport, so the
// two side-by-side copies scroll seamlessly with no visible gap.
const SEGMENT = Array(10).fill('LIVE TOURNEY').join(' • ') + ' • ';
const SPEED_PX_PER_SEC = 70;

// A scrolling red "LIVE TOURNEY" marquee shown at the top of the app whenever
// the signed-in user is in an in-progress live tournament. Tapping opens it.
const LiveTourneyBanner = ({ isAuthenticated, onOpen }) => {
  const [live, setLive] = useState(null);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const scroll = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isAuthenticated) {
      setLive(null);
      return undefined;
    }
    let active = true;
    const check = () => {
      BackendApiService.getMyLiveTourney()
        .then((result) => { if (active) setLive(result || null); })
        .catch(() => { if (active) setLive(null); });
    };
    check();
    const id = setInterval(check, POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!live || !segmentWidth) return undefined;
    scroll.setValue(0);
    const loop = Animated.loop(
      Animated.timing(scroll, {
        toValue: -segmentWidth,
        duration: (segmentWidth / SPEED_PX_PER_SEC) * 1000,
        easing: Easing.linear,
        useNativeDriver: false
      })
    );
    loop.start();
    return () => loop.stop();
  }, [live, segmentWidth, scroll]);

  if (!isAuthenticated || !live) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open the live tournament"
      onPress={() => onOpen?.(live.tournamentId)}
      style={styles.banner}
    >
      <View style={styles.clip} pointerEvents="none">
        <Animated.View style={[styles.track, { transform: [{ translateX: scroll }] }]}>
          <Text style={styles.text} numberOfLines={1} onLayout={(e) => setSegmentWidth(e.nativeEvent.layout.width)}>{SEGMENT}</Text>
          <Text style={styles.text} numberOfLines={1}>{SEGMENT}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  banner: {
    height: 30,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    overflow: 'hidden'
  },
  clip: {
    overflow: 'hidden'
  },
  track: {
    flexDirection: 'row'
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 1.5
  }
});

export default LiveTourneyBanner;
