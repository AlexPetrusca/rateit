import { StyleSheet } from 'react-native';
import AppButton from './AppButton.jsx';
import AppTextInput from './AppTextInput.jsx';
import Card from './Card.jsx';
import RichTextInput from './RichTextInput.jsx';
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
  richText = false
}) => (
  <Card style={[styles.card, cardStyle]}>
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

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    backgroundColor: colors.surface
  }
});

export default RatingComposer;
