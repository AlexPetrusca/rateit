import { StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton.jsx';
import AppTextInput from './AppTextInput.jsx';
import Card from './Card.jsx';
import StarRating from './StarRating.jsx';
import { colors, spacing, text } from '../theme.js';
import { formatFiveStarScore } from '../utils/ratingDisplay.js';

const RatingComposer = ({
  title = 'Your rating',
  score,
  onScoreChange,
  textValue,
  onTextChange,
  placeholder = 'Add your take',
  submitLabel = 'Post',
  onSubmit,
  loading = false,
  multilineLabel = 'Review'
}) => {
  const numericScore = Number(score || 0);

  return (
    <Card style={styles.card}>
      <View style={styles.scoreHeader}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.scoreLabel}>{formatFiveStarScore(numericScore)}</Text>
      </View>
      <StarRating value={numericScore} interactive onChange={onScoreChange} size="lg" />
      <AppTextInput
        label={multilineLabel}
        value={textValue}
        onChangeText={onTextChange}
        placeholder={placeholder}
        multiline
      />
      <AppButton label={submitLabel} onPress={onSubmit} loading={loading} />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    backgroundColor: colors.surface
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  title: text.h3,
  scoreLabel: {
    color: colors.textMuted,
    fontWeight: '800'
  }
});

export default RatingComposer;
