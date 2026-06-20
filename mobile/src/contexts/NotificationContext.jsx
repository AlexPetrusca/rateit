import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme.js';

const NotificationContext = createContext(null);
let nextId = 1;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const notify = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = nextId++;
    setNotifications((current) => [...current, { id, message, type }]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={styles.stack}>
        {notifications.map((notification) => (
          <Pressable
            key={notification.id}
            onPress={() => dismiss(notification.id)}
            style={[
              styles.toast,
              notification.type === 'error' && styles.error,
              notification.type === 'warning' && styles.warning
            ]}
          >
            <Text style={styles.text}>{notification.message}</Text>
          </Pressable>
        ))}
      </View>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 88,
    zIndex: 1000,
    alignItems: 'center',
    gap: spacing.sm,
    elevation: 20
  },
  toast: {
    width: '100%',
    maxWidth: 420,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
    borderColor: colors.borderStrong,
    borderLeftColor: colors.accent,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.38,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 }
      },
      web: {
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.42)'
      }
    })
  },
  error: {
    borderLeftColor: colors.danger
  },
  warning: {
    borderLeftColor: colors.warning
  },
  text: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700'
  }
});
