import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton.jsx';
import AppTextInput from './AppTextInput.jsx';
import Card from './Card.jsx';
import RichTextInput from './RichTextInput.jsx';
import StarRating from './StarRating.jsx';
import { formatFiveStarScore } from '../utils/ratingDisplay.js';
import { colors, spacing, text } from '../theme.js';

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
          <View style={styles.ratingHeader}>
            <Text style={styles.ratingTitle}>{title}</Text>
            <Text style={styles.scoreNumber}>{formatFiveStarScore(Number(preview ?? score) || 0)}</Text>
          </View>
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
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  ratingTitle: {
    ...text.h2
  },
  scoreNumber: {
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
