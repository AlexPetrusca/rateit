import { Image, StyleSheet, Text, View } from 'react-native';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import { colors } from '../theme.js';

const sizes = {
  sm: 30,
  md: 40,
  lg: 52,
  xl: 80
};

const initialsFor = (username, fallbackText) => {
  const source = username || fallbackText || '?';
  return source.trim().slice(0, 2).toUpperCase();
};

const UserAvatar = ({ username, profilePicUrl, size = 'md', fallbackText }) => {
  const dimension = sizes[size] || sizes.md;
  const imageUrl = useResolvedImageUrl(profilePicUrl);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.avatar, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}
      />
    );
  }

  return (
    <View style={[styles.avatar, styles.fallback, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}>
      <Text style={[styles.initials, { fontSize: Math.max(11, dimension * 0.32) }]}>
        {initialsFor(username, fallbackText)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.surfaceMuted
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  initials: {
    color: colors.text,
    fontWeight: '800'
  }
});

export default UserAvatar;
