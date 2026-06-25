import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton.jsx';
import AppTextInput from './AppTextInput.jsx';
import Card from './Card.jsx';
import RichTextInput from './RichTextInput.jsx';
import StarRating from './StarRating.jsx';
import { formatFiveStarScore } from '../utils/ratingDisplay.js';
import { colors, spacing } from '../theme.js';

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
  multilineLabel = 'Review',
  cardStyle,
  richText = false,
  showStars = false
}) => {
  const [preview, setPreview] = useState(null);
  return (
    <Card style={[styles.card, cardStyle]}>
      {showStars ? (
        <View style={styles.ratingBlock}>
          <Text style={styles.scoreNumber}>{formatFiveStarScore(Number(preview ?? score) || 0)}</Text>
          <View style={styles.starRow}>
            <StarRating
              value={Number(score) || 0}
              interactive
              size="lg"
              onChange={onScoreChange}
              onPreviewChange={setPreview}
            />
          </View>
        </View>
      ) : null}
      {richText ? (
        <RichTextInput
          value={textValue}
          onChangeText={onTextChange}
          placeholder={placeholder}
        />
      ) : (
        <AppTextInput
          value={textValue}
          onChangeText={onTextChange}
          placeholder={placeholder}
          multiline
        />
      )}
      <AppButton label={submitLabel} onPress={onSubmit} loading={loading} />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    backgroundColor: colors.surface
  },
  ratingBlock: {
    gap: spacing.sm
  },
  scoreNumber: {
    alignSelf: 'flex-end',
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums']
  },
  starRow: {
    alignItems: 'center'
  }
});

export default RatingComposer;
