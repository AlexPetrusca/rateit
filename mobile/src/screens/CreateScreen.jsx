import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import HandDrawnIcon from '../components/HandDrawnIcon.jsx';
import RichText from '../components/RichText.jsx';
import RichTextInput from '../components/RichTextInput.jsx';
import Screen from '../components/Screen.jsx';
import StarRating from '../components/StarRating.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';
import { buildCreateRatingRequest, formatFiveStarScore, validateCreateRatingDraft } from '../utils/ratingDisplay.js';

const CreateScreen = ({ navigation, route }) => {
  const { notify } = useNotifications();
  const incomingDraft = route.params?.draft;
  const incomingMode = route.params?.mode;
  const [draftId, setDraftId] = useState(incomingDraft?.id ?? null);
  const [body, setBody] = useState(incomingDraft?.body ?? '');
  const [reviewText, setReviewText] = useState(incomingDraft?.reviewText ?? '');
  const [score, setScore] = useState(incomingDraft?.score ?? 4);
  const [previewScore, setPreviewScore] = useState(null);
  const [postMode, setPostMode] = useState('rate');
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingMedia, setExistingMedia] = useState({
    mediaObjectKey: incomingDraft?.mediaObjectKey ?? null,
    mediaContentType: incomingDraft?.mediaContentType ?? null
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const existingMediaUrl = useResolvedImageUrl(existingMedia.mediaObjectKey);

  useEffect(() => {
    if (!incomingDraft) {
      return;
    }
    setDraftId(incomingDraft.id ?? null);
    setBody(incomingDraft.body ?? '');
    setReviewText(incomingDraft.reviewText ?? '');
    setScore(incomingDraft.score ?? 4);
    setPreviewScore(null);
    setSelectedFile(null);
    setExistingMedia({
      mediaObjectKey: incomingDraft.mediaObjectKey ?? null,
      mediaContentType: incomingDraft.mediaContentType ?? null
    });
    navigation.setParams({ draft: undefined });
  }, [incomingDraft, navigation]);

  useEffect(() => {
    if (incomingMode === 'prompt') {
      setPostMode('prompt');
      navigation.setParams({ mode: undefined });
    }
  }, [incomingMode, navigation]);

  useFocusEffect(useCallback(() => () => {
    setDraftId(null);
    setBody('');
    setReviewText('');
    setScore(4);
    setPreviewScore(null);
    setPostMode('rate');
    setSelectedFile(null);
    setExistingMedia({ mediaObjectKey: null, mediaContentType: null });
    setSaving(false);
    setError('');
  }, []));

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
      return existingMedia;
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
        const hasMedia = selectedFile || existingMedia.mediaObjectKey;
        const validationError = postMode === 'prompt'
          ? (!body.trim() && !hasMedia ? 'Add text or a photo to create a prompt.' : '')
          : validateCreateRatingDraft({ body, selectedFile: hasMedia, score });
        if (validationError) {
          setError(validationError);
          return;
        }

        const { mediaObjectKey, mediaContentType } = await uploadMedia();
        if (postMode === 'prompt') {
          await BackendApiService.createPrompt({ body, mediaObjectKey, mediaContentType });
        } else {
          await BackendApiService.createRating(buildCreateRatingRequest({
            body,
            reviewText,
            score,
            mediaObjectKey,
            mediaContentType
          }));
        }
      }
      notify({ message: postMode === 'prompt' ? 'Prompt posted.' : 'Rating posted.', type: 'info' });
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
      <View style={styles.modeToggle}>
        {['rate', 'prompt'].map((mode) => {
          const selected = postMode === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setPostMode(mode)}
              style={[styles.modeOption, selected && styles.modeOptionSelected]}
            >
              <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
                {mode === 'rate' ? 'Rate' : 'Prompt'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <StatusMessage message={error} type="error" />
      <Card>
        <View style={styles.photoHeader}>
          <Text style={styles.sectionTitle}>Photo</Text>
          <AppButton variant="ghost" label="Drafts" onPress={() => navigation.navigate('Drafts')} />
        </View>
        <View style={styles.iconRow}>
          <AppButton variant="secondary" label="Take photo" icon={<HandDrawnIcon name="camera" color={colors.text} />} onPress={() => pickImage(true)} style={styles.iconButton} />
          <AppButton variant="secondary" label="Upload photo" icon={<HandDrawnIcon name="upload" color={colors.text} />} onPress={() => pickImage(false)} style={styles.iconButton} />
          {selectedFile || existingMediaUrl ? (
            <AppButton
              variant="secondary"
              label="Remove photo"
              icon={<HandDrawnIcon name="x" color={colors.text} />}
              onPress={() => {
                setSelectedFile(null);
                setExistingMedia({ mediaObjectKey: null, mediaContentType: null });
              }}
              style={styles.iconButton}
            />
          ) : null}
        </View>
        {selectedFile || existingMediaUrl ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: selectedFile?.uri || existingMediaUrl }} style={styles.preview} />
          </View>
        ) : null}
        <RichTextInput
          label={selectedFile || existingMedia.mediaObjectKey ? 'Title' : 'Topic'}
          value={body}
          onChangeText={setBody}
          placeholder="Write the thing you want to rate, or add a caption for your photo"
        />
        {postMode === 'rate' ? (
          <RichTextInput
            label="Your review"
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="Add your rating context"
          />
        ) : null}
        {postMode === 'rate' ? (
          <>
            <View style={styles.scoreHeader}>
              <Text style={styles.sectionTitle}>Rating</Text>
              <Text style={styles.score}>{formatFiveStarScore(previewScore ?? score)}</Text>
            </View>
            <StarRating value={score} interactive size="lg" onChange={setScore} onPreviewChange={setPreviewScore} />
          </>
        ) : null}
        <Text style={styles.previewLabel}>How it will look:</Text>
        <View style={styles.previewMeta}>
          {body.trim() ? <RichText style={styles.previewText}>{body.trim()}</RichText> : null}
          {postMode === 'rate' && reviewText.trim() ? (
            <RichText style={styles.previewReview}>{reviewText.trim()}</RichText>
          ) : null}
        </View>
        <View style={styles.actionRow}>
          <AppButton variant="secondary" label="Back" icon={<HandDrawnIcon name="back" color={colors.text} />} onPress={() => navigation.goBack()} style={styles.composerButton} />
          <AppButton variant="secondary" label="Save draft" icon={<HandDrawnIcon name="draft" color={colors.text} />} onPress={saveDraft} loading={saving} style={styles.composerButton} />
          <AppButton label="Submit" icon={<HandDrawnIcon name="check" color="#ffffff" />} onPress={submit} loading={saving} style={styles.composerButton} />
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  modeToggle: {
    flexDirection: 'row',
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: 15,
    backgroundColor: colors.surfaceSoft
  },
  modeOption: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12
  },
  modeOptionSelected: {
    backgroundColor: colors.surfacePressed
  },
  modeText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700'
  },
  modeTextSelected: {
    color: colors.text
  },
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
    flexWrap: 'wrap',
    gap: spacing.md
  },
  iconButton: {
    width: 72,
    height: 72,
    borderRadius: 20,
    paddingHorizontal: 0
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16
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
    minHeight: 64,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 16,
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
    flexWrap: 'wrap',
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
