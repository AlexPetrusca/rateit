import { createContext, useContext, useRef } from 'react';
import { Animated } from 'react-native';

// Bar height (paddingVertical 4*2 + button 34 + border 1*2) = 44px
// translateY(44) leaves the bottom:20 gap as a peek, matching the web CSS behavior
const BAR_HEIGHT = 44;

const BottomBarContext = createContext(null);

export const BottomBarProvider = ({ children }) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const translateY = useRef(Animated.diffClamp(scrollY, 0, BAR_HEIGHT)).current;
  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })
  ).current;

  return (
    <BottomBarContext.Provider value={{ translateY, onScroll }}>
      {children}
    </BottomBarContext.Provider>
  );
};

export const useBottomBar = () => useContext(BottomBarContext);
