import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
    bottom: spacing.xl,
    gap: spacing.sm
  },
  toast: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.text
  },
  error: {
    backgroundColor: colors.danger
  },
  warning: {
    backgroundColor: colors.warning
  },
  text: {
    color: '#ffffff',
    fontWeight: '800'
  }
});
