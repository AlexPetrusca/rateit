import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import StarRating from '../components/StarRating.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { spacing, text } from '../theme.js';
import { buildCreateRatingRequest, formatFiveStarScore, validateCreateRatingDraft } from '../utils/ratingDisplay.js';

const CreateScreen = ({ navigation }) => {
  const { notify } = useNotifications();
  const [body, setBody] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [score, setScore] = useState(4);
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName || 'rating-photo.jpg',
        type: asset.mimeType || 'image/jpeg'
      });
    }
  };

  const submit = async () => {
    const validationError = validateCreateRatingDraft({ body, selectedFile, score });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    try {
      let mediaObjectKey = null;
      let mediaContentType = null;
      if (selectedFile) {
        const { uploadUrl, key } = await BackendApiService.getUploadUrl(selectedFile.name, selectedFile.type);
        await BackendApiService.uploadFileToS3(uploadUrl, selectedFile);
        mediaObjectKey = key;
        mediaContentType = selectedFile.type;
      }
      await BackendApiService.createRating(buildCreateRatingRequest({
        body,
        reviewText,
        score,
        mediaObjectKey,
        mediaContentType
      }));
      notify({ message: 'Rating posted.', type: 'info' });
      navigation.navigate('Home');
    } catch (err) {
      setError(err.message || 'Failed to post rating');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Create" subtitle="Rate text or a photo.">
      <StatusMessage message={error} type="error" />
      <Card>
        <AppButton variant="secondary" label={selectedFile ? 'Change photo' : 'Add photo'} onPress={pickImage} />
        {selectedFile ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: selectedFile.uri }} style={styles.preview} />
            <AppButton variant="ghost" label="Remove photo" onPress={() => setSelectedFile(null)} />
          </View>
        ) : null}
        <AppTextInput
          label={selectedFile ? 'Title' : 'Topic'}
          value={body}
          onChangeText={setBody}
          placeholder="Write the thing you want to rate"
          multiline
        />
        <AppTextInput
          label="Your review"
          value={reviewText}
          onChangeText={setReviewText}
          placeholder="Add rating context"
          multiline
        />
        <View style={styles.scoreHeader}>
          <Text style={styles.sectionTitle}>Rating</Text>
          <Text style={styles.score}>{formatFiveStarScore(score)}</Text>
        </View>
        <StarRating value={score} interactive size="lg" onChange={setScore} />
        <AppButton label="Post rating" onPress={submit} loading={saving} />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  previewWrap: {
    gap: spacing.sm
  },
  preview: {
    width: '100%',
    height: 240,
    borderRadius: 8
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  sectionTitle: text.h3,
  score: {
    ...text.muted,
    fontWeight: '800'
  }
});

export default CreateScreen;
