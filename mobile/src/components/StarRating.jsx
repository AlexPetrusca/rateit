import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme.js';
import { MAX_RATING_SCORE, MIN_RATING_SCORE, RATING_SCORE_STEP, ratingForPosition } from '../utils/ratingDisplay.js';

const fillFor = (value, index) => {
  const fill = value - (index - 1);
  return Math.max(0, Math.min(1, fill));
};

const DisplayStar = ({ fill, fontSize }) => {
  const starStyle = [styles.star, { fontSize, lineHeight: fontSize + 2 }];

  return (
    <View style={[styles.starSlot, { width: fontSize + 2, height: fontSize + 2 }]}>
      <Text style={[starStyle, styles.emptyStar]}>☆</Text>
      {fill > 0 ? (
        <View style={[styles.filledStarClip, { width: (fontSize + 2) * fill }]}>
          <Text style={starStyle}>★</Text>
        </View>
      ) : null}
    </View>
  );
};

const StarRating = ({
  value = 0,
  interactive = false,
  onChange,
  size = 'md',
  label
}) => {
  const fontSize = size === 'lg' ? 34 : size === 'sm' ? 17 : 24;
  const roundedValue = Number(value) || 0;
  const [controlWidth, setControlWidth] = useState(0);

  if (interactive) {
    const updateFromTouch = ({ nativeEvent }) => {
      onChange?.(ratingForPosition(nativeEvent.locationX, controlWidth));
    };

    const adjust = (direction) => {
      const next = roundedValue + direction * RATING_SCORE_STEP;
      onChange?.(Math.min(MAX_RATING_SCORE, Math.max(MIN_RATING_SCORE, next)));
    };

    return (
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel={label || 'Rating'}
        accessibilityValue={{ min: MIN_RATING_SCORE, max: MAX_RATING_SCORE, now: roundedValue, text: `${roundedValue} out of 5` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={({ nativeEvent }) => adjust(nativeEvent.actionName === 'increment' ? 1 : -1)}
        onLayout={({ nativeEvent }) => setControlWidth(nativeEvent.layout.width)}
        onPress={updateFromTouch}
        onTouchMove={updateFromTouch}
        style={styles.interactive}
      >
        <View pointerEvents="none" style={styles.display}>
          {[1, 2, 3, 4, 5].map((index) => (
            <DisplayStar key={index} fill={fillFor(roundedValue, index)} fontSize={fontSize} />
          ))}
        </View>
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={label} style={styles.display}>
      {[1, 2, 3, 4, 5].map((index) => (
        <DisplayStar key={index} fill={fillFor(roundedValue, index)} fontSize={fontSize} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  display: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  interactive: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  star: {
    color: colors.star,
    fontWeight: '900'
  },
  starSlot: {
    position: 'relative',
    overflow: 'hidden'
  },
  emptyStar: {
    color: colors.borderStrong
  },
  filledStarClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden'
  }
});

export default StarRating;
