import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import Card from '../components/Card.jsx';
import RichText from '../components/RichText.jsx';
import Screen from '../components/Screen.jsx';
import StarRating from '../components/StarRating.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';
import { buildCreateRatingRequest, formatFiveStarScore, validateCreateRatingDraft } from '../utils/ratingDisplay.js';

const CreateScreen = ({ navigation, route }) => {
  const { notify } = useNotifications();
  const incomingDraft = route.params?.draft;
  const [draftId, setDraftId] = useState(incomingDraft?.id ?? null);
  const [body, setBody] = useState(incomingDraft?.body ?? '');
  const [reviewText, setReviewText] = useState(incomingDraft?.reviewText ?? '');
  const [score, setScore] = useState(incomingDraft?.score ?? 4);
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!incomingDraft) {
      return;
    }
    setDraftId(incomingDraft.id ?? null);
    setBody(incomingDraft.body ?? '');
    setReviewText(incomingDraft.reviewText ?? '');
    setScore(incomingDraft.score ?? 4);
  }, [incomingDraft]);

  const pickImage = async (camera = false) => {
    const launcher = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launcher({
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

  const uploadMedia = async () => {
    if (!selectedFile) {
      return { mediaObjectKey: null, mediaContentType: null };
    }
    const { uploadUrl, key } = await BackendApiService.getUploadUrl(selectedFile.name, selectedFile.type);
    await BackendApiService.uploadFileToS3(uploadUrl, selectedFile);
    return { mediaObjectKey: key, mediaContentType: selectedFile.type };
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      if (draftId) {
        await BackendApiService.publishDraft(draftId);
      } else {
        const validationError = validateCreateRatingDraft({ body, selectedFile, score });
        if (validationError) {
          setError(validationError);
          return;
        }

        const { mediaObjectKey, mediaContentType } = await uploadMedia();
        await BackendApiService.createRating(buildCreateRatingRequest({
          body,
          reviewText,
          score,
          mediaObjectKey,
          mediaContentType
        }));
      }
      notify({ message: 'Rating posted.', type: 'info' });
      navigation.navigate('Home');
    } catch (err) {
      setError(err.message || 'Failed to post rating');
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!body.trim() && !selectedFile && !reviewText.trim()) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { mediaObjectKey, mediaContentType } = await uploadMedia();
      const saved = await BackendApiService.saveDraft({
        id: draftId,
        body,
        reviewText,
        score: score ? Number(score) : null,
        mediaObjectKey,
        mediaContentType
      });
      setDraftId(saved.id);
      notify({ message: 'Draft saved.', type: 'info' });
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Create" subtitle="Rate text or a photo.">
      <StatusMessage message={error} type="error" />
      <Card>
        <View style={styles.photoHeader}>
          <Text style={styles.sectionTitle}>Photo</Text>
          <AppButton variant="ghost" label="Drafts" onPress={() => navigation.navigate('Drafts')} />
        </View>
        <View style={styles.iconRow}>
          <AppButton variant="secondary" label="⌕" onPress={() => pickImage(true)} style={styles.iconButton} textStyle={styles.iconText} />
          <AppButton variant="secondary" label="⇧" onPress={() => pickImage(false)} style={styles.iconButton} textStyle={styles.iconText} />
          {selectedFile ? (
            <AppButton variant="secondary" label="×" onPress={() => setSelectedFile(null)} style={styles.iconButton} textStyle={styles.iconText} />
          ) : null}
        </View>
        {selectedFile ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: selectedFile.uri }} style={styles.preview} />
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
        <Text style={styles.previewLabel}>How it will look:</Text>
        <View style={styles.previewMeta}>
          <RichText style={styles.previewText}>{body.trim() || 'Add text to describe the thing you are rating.'}</RichText>
          {reviewText.trim() ? <RichText style={styles.previewReview}>{reviewText.trim()}</RichText> : null}
        </View>
        <View style={styles.actionRow}>
          <AppButton variant="secondary" label="←" onPress={() => navigation.goBack()} style={styles.composerButton} textStyle={styles.iconText} />
          <AppButton variant="secondary" label="▱" onPress={saveDraft} loading={saving} style={styles.composerButton} textStyle={styles.iconText} />
          <AppButton label="✓" onPress={submit} loading={saving} style={styles.composerButton} textStyle={styles.iconText} />
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  previewWrap: {
    gap: spacing.sm
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  iconRow: {
    flexDirection: 'row',
    gap: spacing.md
  },
  iconButton: {
    width: 72,
    height: 72,
    borderRadius: 6,
    paddingHorizontal: 0
  },
  iconText: {
    fontSize: 24,
    color: colors.text
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
  },
  previewLabel: {
    ...text.muted,
    fontWeight: '800'
  },
  previewMeta: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    gap: spacing.sm
  },
  previewText: text.body,
  previewReview: {
    ...text.muted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md
  },
  composerButton: {
    width: 52,
    minWidth: 52,
    height: 52,
    paddingHorizontal: 0
  }
});

export default CreateScreen;
