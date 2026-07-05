import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import HandDrawnIcon from '../components/HandDrawnIcon.jsx';
import Screen from '../components/Screen.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';
import { prepareImageForUpload } from '../utils/imageUpload.js';

const ProfileEditorScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const { notify } = useNotifications();
  const [selectedImage, setSelectedImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async (camera = false) => {
    const launcher = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launcher({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      shape: 'oval',
      quality: 0.85
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedImage(await prepareImageForUpload(asset));
    }
  };

  const save = async () => {
    if (!selectedImage) {
      navigation.goBack();
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { uploadUrl, key } = await BackendApiService.getUploadUrl(selectedImage.name, selectedImage.type);
      await BackendApiService.uploadFileToS3(uploadUrl, selectedImage);
      // PUT /me validates the whole user, so include the current username (the
      // editor only changes the photo). Backend excludes self from the uniqueness
      // check, so resending the same username is a no-op.
      const nextUser = await BackendApiService.updateCurrentUser({ username: user?.username, profilePicUrl: key });
      updateUser(nextUser);
      notify({ message: 'Profile photo updated.', type: 'info' });
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const currentProfilePicUrl = useResolvedImageUrl(user?.profilePicUrl);
  const previewUrl = selectedImage?.uri || currentProfilePicUrl;

  return (
    <Screen>
      <Card style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update the photo people see next to your ratings and comments.</Text>
        </View>
        <StatusMessage message={error} type="error" />
        <View style={styles.previewWrap}>
          {selectedImage ? (
            <Image source={{ uri: previewUrl }} style={styles.preview} />
          ) : (
            <UserAvatar username={user?.username} profilePicUrl={user?.profilePicUrl} size={144} />
          )}
        </View>
        <View style={styles.controls}>
          <Text style={styles.label}>Profile Picture</Text>
          <View style={styles.photoActions}>
            <AppButton
              variant="secondary"
              label="Take photo"
              icon={<HandDrawnIcon name="camera" color={colors.text} />}
              onPress={() => pickImage(true)}
              style={styles.photoButton}
            />
            <AppButton
              variant="secondary"
              label="Upload photo"
              icon={<HandDrawnIcon name="upload" color={colors.text} />}
              onPress={() => pickImage(false)}
              style={styles.photoButton}
            />
          </View>
        </View>
        <View style={styles.actions}>
          <AppButton variant="secondary" label="Cancel" onPress={() => navigation.goBack()} style={styles.actionButton} />
          <AppButton label="Save" onPress={save} loading={saving} style={styles.actionButton} />
        </View>
        <View style={styles.links}>
          <AppButton variant="secondary" label="Backlog" onPress={() => navigation.navigate('Backlog')} style={styles.linkButton} />
          <AppButton variant="secondary" label="Install" onPress={() => navigation.navigate('InstallInfo')} style={styles.linkButton} />
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  panel: {
    gap: spacing.xl
  },
  header: {
    gap: spacing.xs
  },
  title: text.h1,
  subtitle: {
    ...text.body,
    color: colors.textMuted
  },
  previewWrap: {
    alignItems: 'center'
  },
  preview: {
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted
  },
  controls: {
    gap: spacing.sm
  },
  label: {
    ...text.body,
    fontWeight: '800'
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.md
  },
  photoButton: {
    width: 48,
    minWidth: 48,
    height: 48,
    minHeight: 48,
    paddingHorizontal: 0
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm
  },
  actionButton: {
    minWidth: 96
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl
  },
  linkButton: {
    minHeight: 40,
    paddingVertical: spacing.sm
  }
});

export default ProfileEditorScreen;
