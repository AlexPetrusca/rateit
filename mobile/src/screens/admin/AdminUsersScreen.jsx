import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton.jsx';
import AppTextInput from '../../components/AppTextInput.jsx';
import Card from '../../components/Card.jsx';
import Screen from '../../components/Screen.jsx';
import UserAvatar from '../../components/UserAvatar.jsx';
import { useNotifications } from '../../contexts/NotificationContext.jsx';
import BackendApiService from '../../services/BackendApiService.js';
import { spacing, text } from '../../theme.js';

const AdminUsersScreen = () => {
  const { notify } = useNotifications();
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await BackendApiService.getAdminUsers({ page: 0, size: 50 });
      setUsers(page.content || []);
    } catch (error) {
      notify({ message: error.message || 'Failed to load users', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    await BackendApiService.updateAdminUser(editing.userId, editing);
    setEditing(null);
    await load();
  };

  const remove = async (userId) => {
    await BackendApiService.deleteAdminUser(userId);
    await load();
  };

  return (
    <Screen title="Admin Users" scroll={false}>
      <FlatList
        refreshing={loading}
        onRefresh={load}
        data={users}
        keyExtractor={(item) => String(item.userId)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <UserAvatar username={item.username} profilePicUrl={item.profilePicUrl} />
              <View style={styles.copy}>
                <Text style={styles.title}>{item.username || `User ${item.userId}`}</Text>
                <Text style={styles.muted}>{item.role} · {item.status || 'ACTIVE'}</Text>
              </View>
            </View>
            {editing?.userId === item.userId ? (
              <>
                <AppTextInput label="Username" value={editing.username || ''} onChangeText={(username) => setEditing((current) => ({ ...current, username }))} />
                <AppTextInput label="Role" value={editing.role || ''} onChangeText={(role) => setEditing((current) => ({ ...current, role }))} autoCapitalize="characters" />
                <AppTextInput label="Status" value={editing.status || ''} onChangeText={(status) => setEditing((current) => ({ ...current, status }))} autoCapitalize="characters" />
                <AppButton label="Save" onPress={save} />
                <AppButton variant="ghost" label="Cancel" onPress={() => setEditing(null)} />
              </>
            ) : (
              <View style={styles.actions}>
                <AppButton variant="secondary" label="Edit" onPress={() => setEditing(item)} />
                <AppButton variant="danger" label="Delete" onPress={() => remove(item.userId)} />
              </View>
            )}
          </Card>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1 },
  title: text.h3,
  muted: text.muted,
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }
});

export default AdminUsersScreen;
