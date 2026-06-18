import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import StarRating from '../components/StarRating.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { spacing, text } from '../theme.js';
import { formatFiveStarScore } from '../utils/ratingDisplay.js';

const PostEditorScreen = ({ navigation, route }) => {
  const { notify } = useNotifications();
  const { ratingId } = route.params || {};
  const [rating, setRating] = useState(null);
  const [body, setBody] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [score, setScore] = useState(4);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextRating = await BackendApiService.getRating(ratingId);
      setRating(nextRating);
      setBody(nextRating.rateableItem?.title || nextRating.rateableItem?.body || '');
      setReviewText(nextRating.reviewText || '');
      setScore(Number(nextRating.score || 4));
    } catch (err) {
      setError(err.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [ratingId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await BackendApiService.updateRating(ratingId, { body, reviewText, score });
      notify({ message: 'Post updated.', type: 'info' });
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError('');
    try {
      await BackendApiService.deleteRating(ratingId);
      notify({ message: 'Post deleted.', type: 'info' });
      navigation.navigate('Home');
    } catch (err) {
      setError(err.message || 'Failed to delete post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Edit Post" subtitle={loading ? 'Loading...' : undefined}>
      <StatusMessage message={error} type="error" />
      {rating ? (
        <Card>
          <AppTextInput label="Topic" value={body} onChangeText={setBody} multiline />
          <AppTextInput label="Review" value={reviewText} onChangeText={setReviewText} multiline />
          <View style={styles.scoreHeader}>
            <Text style={styles.label}>Rating</Text>
            <Text style={styles.score}>{formatFiveStarScore(score)}</Text>
          </View>
          <StarRating value={score} interactive size="lg" onChange={setScore} />
          <AppButton label="Save changes" onPress={save} loading={saving} />
          <AppButton variant="danger" label="Delete post" onPress={remove} disabled={saving} />
        </Card>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  label: text.h3,
  score: {
    ...text.muted,
    fontWeight: '800'
  }
});

export default PostEditorScreen;
