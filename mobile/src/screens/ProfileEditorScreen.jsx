import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, StyleSheet } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import BackendApiService from '../services/BackendApiService.js';
import { spacing } from '../theme.js';

const ProfileEditorScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const { notify } = useNotifications();
  const [selectedImage, setSelectedImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        name: asset.fileName || 'profile.jpg',
        type: asset.mimeType || 'image/jpeg'
      });
    }
  };

  const save = async () => {
    if (!selectedImage) {
      setError('Choose an image before saving.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { uploadUrl, key } = await BackendApiService.getUploadUrl(selectedImage.name, selectedImage.type);
      await BackendApiService.uploadFileToS3(uploadUrl, selectedImage);
      const nextUser = await BackendApiService.updateCurrentUser({ profilePicUrl: key });
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
    <Screen title="Profile Photo">
      <StatusMessage message={error} type="error" />
      <Card>
        {previewUrl ? <Image source={{ uri: previewUrl }} style={styles.preview} /> : null}
        <AppButton variant="secondary" label="Choose photo" onPress={pickImage} />
        <AppButton label="Save photo" onPress={save} loading={saving} />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: spacing.sm
  }
});

export default ProfileEditorScreen;
