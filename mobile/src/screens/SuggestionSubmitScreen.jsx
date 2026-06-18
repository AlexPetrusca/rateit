import { useState } from 'react';
import AppButton from '../components/AppButton.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';

const SuggestionSubmitScreen = ({ navigation }) => {
  const { notify } = useNotifications();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError('A title is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await BackendApiService.createSuggestion({ title: nextTitle, body: body.trim() });
      notify({ message: 'Suggestion sent.', type: 'info' });
      navigation.navigate('Backlog');
    } catch (err) {
      setError(err.message || 'Failed to submit suggestion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Suggestion" subtitle="Share something you want added or improved.">
      <StatusMessage message={error} type="error" />
      <Card>
        <AppTextInput label="Title" value={title} onChangeText={setTitle} />
        <AppTextInput label="Suggestion" value={body} onChangeText={setBody} multiline />
        <AppButton label="Send suggestion" onPress={submit} loading={saving} />
      </Card>
    </Screen>
  );
};

export default SuggestionSubmitScreen;
