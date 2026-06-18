import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme.js';

const stepValues = Array.from({ length: 10 }, (_, index) => (index + 1) / 2);

const starFor = (value, index) => {
  if (value >= index) {
    return '★';
  }
  if (value >= index - 0.5) {
    return '⯨';
  }
  return '☆';
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
        <Text key={index} style={[styles.star, { fontSize }]}>
          {starFor(roundedValue, index)}
        </Text>
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
  }
});

export default StarRating;
