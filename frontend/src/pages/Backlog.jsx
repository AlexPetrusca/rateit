import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { backlogData } from '../generated/backlogData.js';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
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

const formatTimestamp = (value) => {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(new Date(value));
};

const CommentBubbleIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
        <path
            fill="currentColor"
            d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9.5L5 21v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm1 3v8h2v2.17L9.17 15H20V7H5Z"
        />
    </svg>
);

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
                        <button type="button" className="nav-pill-button" onClick={() => navigate('/')}>
                            Home
                        </button>
                        <button
                            type="button"
                            className="nav-pill-button backlog-suggest-button"
                            onClick={() => navigate('/backlog/suggest')}
                            aria-label="Submit a suggestion"
                        >
                            <span className="backlog-suggest-icon" aria-hidden="true">
                                <CommentBubbleIcon />
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

                    <Paper variant="outlined" className="backlog-suggestions-table">
                        {suggestionsLoading ? (
                            <Box sx={{ p: 2.5 }}>
                                <Typography color="text.secondary">Loading suggestions...</Typography>
                            </Box>
                        ) : suggestions.length === 0 ? (
                            <Box sx={{ p: 2.5 }}>
                                <Typography color="text.secondary">No suggestions yet.</Typography>
                            </Box>
                        ) : (
                            <Table size="small" aria-label="Suggestions table">
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
                                            <TableCell>{formatTimestamp(suggestion.createdAt)}</TableCell>
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
