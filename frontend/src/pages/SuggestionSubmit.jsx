import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const SuggestionSubmit = () => {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [loadError, setLoadError] = useState('');

    const handleSubmit = async () => {
        const nextTitle = title.trim();
        const nextBody = body.trim();

        if (!nextTitle) {
            setLoadError('A title is required.');
            return;
        }

        setLoadError('');
        setIsSaving(true);

        try {
            await BackendApiService.createSuggestion({
                title: nextTitle,
                body: nextBody
            });
            notify({ message: 'Suggestion sent', type: 'info' });
            navigate('/backlog');
        } catch (error) {
            setLoadError(error.message || 'Failed to submit suggestion');
            notify({ message: error.message || 'Failed to submit suggestion', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Box className="feed-page">
            <Container maxWidth="sm" sx={{ py: 3 }}>
                <Paper elevation={1} sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                        <Box>
                            <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                                Suggestion
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Share something you want added or improved in Critic.
                            </Typography>
                        </Box>

                        {loadError && <Alert severity="error">{loadError}</Alert>}

                        <TextField
                            label="Title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            fullWidth
                            autoFocus
                        />
                        <TextField
                            label="Suggestion"
                            value={body}
                            onChange={(event) => setBody(event.target.value)}
                            fullWidth
                            multiline
                            minRows={6}
                            helperText="Optional"
                        />

                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            <Button variant="outlined" onClick={() => navigate('/backlog')}>
                                Cancel
                            </Button>
                            <Button variant="contained" onClick={handleSubmit} disabled={isSaving}>
                                {isSaving ? 'Sending...' : 'Send suggestion'}
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
};

export default SuggestionSubmit;
