import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme.js';

const stepValues = Array.from({ length: 10 }, (_, index) => (index + 1) / 2);

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

  if (interactive) {
    return (
      <View accessibilityLabel={label} style={styles.interactive}>
        {stepValues.map((score) => (
          <Pressable
            accessibilityRole="button"
            key={score}
            onPress={() => onChange?.(score)}
            style={styles.hit}
          >
            <Text style={[styles.star, { fontSize, color: score <= roundedValue ? colors.star : colors.borderStrong }]}>
              {score % 1 === 0 ? '★' : '·'}
            </Text>
          </Pressable>
        ))}
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  hit: {
    minWidth: 20,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs
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
