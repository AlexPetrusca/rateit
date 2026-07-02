import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import BackendApiService from '../services/BackendApiService.js';
import { colors } from '../theme.js';

const POLL_MS = 30000;
// One segment repeats the phrase enough times to exceed any viewport width, so
// the two identical segments laid back-to-back always cover the bar — animating
// left by exactly one segment width then looping is seamless (no gap).
const SEGMENT = `${Array(12).fill('LIVE TOURNEY').join('   •   ')}   •   `;
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
        useNativeDriver: true
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
      <Animated.View style={[styles.track, { transform: [{ translateX: scroll }] }]} pointerEvents="none">
        <Text style={styles.text} numberOfLines={1} onLayout={(e) => setSegmentWidth(e.nativeEvent.layout.width)}>{SEGMENT}</Text>
        <Text style={styles.text} numberOfLines={1}>{SEGMENT}</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  banner: {
    height: 30,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden'
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  text: {
    flexShrink: 0,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5
  }
});

export default LiveTourneyBanner;
