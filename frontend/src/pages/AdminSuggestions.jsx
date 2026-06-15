import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import AdminDataGrid from '../components/AdminDataGrid.jsx';
import Modal from '../components/Modal.jsx';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';

const DEFAULT_PAGE_SIZE = 10;

const formatTimestamp = (value) => {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
    }).format(new Date(value));
};

const truncateText = (value, maxLength = 140) => {
    if (typeof value !== 'string') {
        return '—';
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return '—';
    }

    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
};

const AdminSuggestions = () => {
    const { notify } = useNotifications();
    const [suggestions, setSuggestions] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadSuggestions = useCallback(async (nextPaginationModel = paginationModel) => {
        setIsLoading(true);
        setLoadError('');

        try {
            const page = await BackendApiService.getAdminSuggestions({
                page: nextPaginationModel.page,
                size: nextPaginationModel.pageSize
            });
            const nextRows = page.content || [];
            setSuggestions(nextRows);
            setRowCount(page.totalElements || 0);
        } catch (error) {
            setLoadError(error.message || 'Failed to load suggestions');
            notify({ message: error.message || 'Failed to load suggestions', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [notify, paginationModel]);

    useEffect(() => {
        loadSuggestions(paginationModel);
    }, [loadSuggestions, paginationModel]);

    const handleDelete = async () => {
        if (!deleteTarget) {
            return;
        }

        setIsDeleting(true);
        try {
            await BackendApiService.deleteAdminSuggestion(deleteTarget.suggestionId);
            notify({ message: `Deleted suggestion #${deleteTarget.suggestionId}`, type: 'info' });
            setDeleteTarget(null);
            await loadSuggestions(paginationModel);
        } catch (error) {
            notify({ message: error.message || 'Failed to delete suggestion', type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const columns = useMemo(() => [
        {
            field: 'suggestionId',
            headerName: 'ID',
            width: 90,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'title',
            headerName: 'Title',
            minWidth: 220,
            flex: 0.9,
            renderCell: (params) => (
                <Box sx={{ width: '100%', py: 1 }}>
                    <Typography variant="body2" fontWeight={700}>
                        {truncateText(params.value, 120)}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'body',
            headerName: 'Suggestion',
            minWidth: 300,
            flex: 1.6,
            renderCell: (params) => (
                <Box sx={{ width: '100%', py: 1 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            lineHeight: 1.35,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}
                    >
                        {truncateText(params.value, 220)}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'authorUsername',
            headerName: 'Author',
            minWidth: 160,
            flex: 0.6,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'createdAt',
            headerName: 'Created',
            width: 170,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => formatTimestamp(params.value)
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget(params.row);
                    }}
                >
                    Delete
                </Button>
            )
        }
    ], []);

    return (
        <Stack spacing={3}>
            <Paper elevation={1} sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="h6" component="h2" gutterBottom>
                            Suggestions
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Review backlog suggestions and remove anything that should not stay in the queue.
                        </Typography>
                    </Box>

                    {loadError && <Alert severity="error">{loadError}</Alert>}

                    <AdminDataGrid
                        autoHeight
                        rows={suggestions}
                        columns={columns}
                        getRowId={(row) => row.suggestionId}
                        disableRowSelectionOnClick
                        disableColumnSorting
                        pagination
                        paginationMode="server"
                        pageSizeOptions={[10, 20, 50]}
                        rowCount={rowCount}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        loading={isLoading}
                        localeText={{ noRowsLabel: 'No suggestions found.' }}
                    />
                </Stack>
            </Paper>

            <Modal
                isOpen={deleteTarget != null}
                title={deleteTarget ? `Delete suggestion #${deleteTarget.suggestionId}` : 'Delete suggestion'}
                onClose={() => setDeleteTarget(null)}
            >
                {deleteTarget && (
                    <Stack spacing={2}>
                        <Alert severity="warning">
                            This will permanently delete the suggestion from the backlog and admin views.
                        </Alert>
                        <Typography variant="body1">
                            Delete suggestion <strong>#{deleteTarget.suggestionId}</strong>?
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Title: <strong>{truncateText(deleteTarget.title, 120)}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Content: <strong>{truncateText(deleteTarget.body, 180)}</strong>
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            <Button variant="outlined" onClick={() => setDeleteTarget(null)}>
                                Cancel
                            </Button>
                            <Button
                                color="error"
                                variant="contained"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete suggestion'}
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </Modal>
        </Stack>
    );
};

export default AdminSuggestions;
