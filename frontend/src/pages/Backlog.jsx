import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import { Alert, Box, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { backlogData } from '../generated/backlogData.js';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import { formatShortTimestamp } from '../utils/dateTime.js';
import '../App.css';

const renderInlineText = (text) => {
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
        }

        return <span key={`${part}-${index}`}>{part}</span>;
    });
};


const Backlog = () => {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const priorityOrder = useMemo(() => ['P1', 'P2', 'P3', 'P4', 'P5'], []);
    const sectionsByPriority = useMemo(() => {
        return new Map((backlogData?.sections || []).map((section) => [section.priority, section]));
    }, []);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(true);
    const [suggestionsError, setSuggestionsError] = useState('');

    useEffect(() => {
        let isMounted = true;

        BackendApiService.getSuggestions({ page: 0, size: 20 })
            .then((page) => {
                if (!isMounted) {
                    return;
                }

                setSuggestions(page.content || []);
                setSuggestionsError('');
            })
            .catch((error) => {
                if (!isMounted) {
                    return;
                }

                setSuggestionsError(error.message || 'Failed to load suggestions');
                notify({ message: error.message || 'Failed to load suggestions', type: 'error' });
            })
            .finally(() => {
                if (isMounted) {
                    setSuggestionsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [notify]);

    return (
        <div className="feed-page">
            <main className="twitter-shell backlog-shell">
                <div className="timeline-header backlog-header">
                    <div>
                        <h1>Backlog</h1>
                        <p>Rendered from the To Do section of build-status.</p>
                    </div>
                    <div className="backlog-header-actions">
                        <button type="button" className="nav-pill-button backlog-nav-pill-button" onClick={() => navigate('/')}>
                            Home
                        </button>
                        <button
                            type="button"
                            className="nav-pill-button backlog-nav-pill-button backlog-suggest-button"
                            onClick={() => navigate('/backlog/suggest')}
                            aria-label="Submit a suggestion"
                        >
                            <span className="backlog-suggest-icon" aria-hidden="true">
                                <ChatBubbleIcon fontSize="small" />
                            </span>
                            <span>Suggest</span>
                        </button>
                    </div>
                </div>

                <section className="backlog-body" aria-label="Project backlog">
                    {priorityOrder.map((priority) => {
                        const section = sectionsByPriority.get(priority);
                        const items = section?.items || [];

                        return (
                            <div key={priority} className="backlog-section">
                                <h2>{priority}</h2>
                                {items.length === 0 ? (
                                    <p className="backlog-empty">No items yet.</p>
                                ) : (
                                    <ul>
                                        {items.map((item) => (
                                            <li key={item}>{renderInlineText(item)}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </section>

                <section className="backlog-suggestions" aria-label="Suggestions">
                    <div className="backlog-suggestions-header">
                        <div>
                            <h2>Suggestions</h2>
                            <p>Recent ideas from the backlog community.</p>
                        </div>
                    </div>

                    {suggestionsError && <Alert severity="error">{suggestionsError}</Alert>}

                    <Paper
                        variant="outlined"
                        className="backlog-suggestions-table"
                        sx={{
                            backgroundColor: 'var(--surface)',
                            color: 'var(--text-primary)',
                            borderColor: 'var(--border-subtle)'
                        }}
                    >
                        {suggestionsLoading ? (
                            <Box sx={{ p: 2.5 }}>
                                <Typography sx={{ color: 'var(--text-secondary)' }}>Loading suggestions...</Typography>
                            </Box>
                        ) : suggestions.length === 0 ? (
                            <Box sx={{ p: 2.5 }}>
                                <Typography sx={{ color: 'var(--text-secondary)' }}>No suggestions yet.</Typography>
                            </Box>
                        ) : (
                            <Table
                                size="small"
                                aria-label="Suggestions table"
                                sx={{
                                    color: 'var(--text-primary)',
                                    '& .MuiTableCell-root': {
                                        color: 'var(--text-primary)',
                                        borderBottomColor: 'var(--border-subtle)'
                                    },
                                    '& .MuiTableCell-head': {
                                        color: 'var(--text-primary)'
                                    }
                                }}
                            >
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Title</TableCell>
                                        <TableCell>Suggestion</TableCell>
                                        <TableCell>Author</TableCell>
                                        <TableCell>Created</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {suggestions.map((suggestion) => (
                                        <TableRow key={suggestion.suggestionId}>
                                            <TableCell className="backlog-suggestion-title">
                                                {suggestion.title}
                                            </TableCell>
                                            <TableCell className="backlog-suggestion-body">
                                                {suggestion.body}
                                            </TableCell>
                                            <TableCell>{suggestion.authorUsername}</TableCell>
                                            <TableCell>{formatShortTimestamp(suggestion.createdAt)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Paper>
                </section>
            </main>
        </div>
    );
};

export default Backlog;
