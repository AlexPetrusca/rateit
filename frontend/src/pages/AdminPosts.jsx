import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import AdminDataGrid from '../components/AdminDataGrid.jsx';
import Modal from '../components/Modal.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';

const DEFAULT_PAGE_SIZE = 10;
const VISIBILITY_OPTIONS = ['PUBLIC', 'FRIENDS', 'PRIVATE'];

const formatTimestamp = (value) => {
    if (!value) {
        return '—';
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
    }).format(new Date(value));
};

const visibilityChipColor = (visibility) => {
    switch (visibility) {
        case 'PUBLIC':
            return 'success';
        case 'FRIENDS':
            return 'info';
        case 'PRIVATE':
            return 'default';
        default:
            return 'default';
    }
};

const normalizeOptional = (value) => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
};

const truncateText = (value, maxLength = 120) => {
    if (typeof value !== 'string') {
        return '—';
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return '—';
    }

    return trimmed.length > maxLength
        ? `${trimmed.slice(0, maxLength - 1)}…`
        : trimmed;
};

const emptySelectionModel = {
    type: 'include',
    ids: new Set()
};

const getSelectedRowIds = (selectionModel, rows, getRowId) => {
    if (!selectionModel) {
        return [];
    }

    const rowIds = rows.map(getRowId);

    if (selectionModel.type === 'exclude') {
        return rowIds.filter((rowId) => !selectionModel.ids.has(rowId));
    }

    return rowIds.filter((rowId) => selectionModel.ids.has(rowId));
};

const AdminPosts = () => {
    const { notify } = useNotifications();
    const [posts, setPosts] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [editingPost, setEditingPost] = useState(null);
    const [editDraft, setEditDraft] = useState({
        body: '',
        reviewText: '',
        score: '1',
        visibility: 'PUBLIC'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedPostSelectionModel, setSelectedPostSelectionModel] = useState(emptySelectionModel);
    const [isBulkDeletePostsOpen, setIsBulkDeletePostsOpen] = useState(false);
    const [isDeletingSelectedPosts, setIsDeletingSelectedPosts] = useState(false);

    const loadPosts = useCallback(async (nextPaginationModel = paginationModel) => {
        setIsLoading(true);
        setLoadError('');

        try {
            const page = await BackendApiService.getAdminPosts({
                page: nextPaginationModel.page,
                size: nextPaginationModel.pageSize
            });
            const nextRows = page.content || [];
            setPosts(nextRows);
            setRowCount(page.totalElements || 0);
            setSelectedPostSelectionModel(emptySelectionModel);

            if (nextPaginationModel.page > 0 && nextRows.length === 0 && (page.totalElements || 0) > 0) {
                setPaginationModel((current) => ({
                    ...current,
                    page: Math.max(0, current.page - 1)
                }));
            }
        } catch (error) {
            setLoadError(error.message || 'Failed to load posts');
            notify({ message: error.message || 'Failed to load posts', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [notify, paginationModel]);

    useEffect(() => {
        let isMounted = true;

        BackendApiService.getAdminPosts({
            page: paginationModel.page,
            size: paginationModel.pageSize
        })
            .then((page) => {
                if (!isMounted) {
                    return;
                }

                const nextRows = page.content || [];
                setPosts(nextRows);
                setRowCount(page.totalElements || 0);
                setLoadError('');
                setSelectedPostSelectionModel(emptySelectionModel);

                if (paginationModel.page > 0 && nextRows.length === 0 && (page.totalElements || 0) > 0) {
                    setPaginationModel((current) => ({
                        ...current,
                        page: Math.max(0, current.page - 1)
                    }));
                }
            })
            .catch((error) => {
                if (!isMounted) {
                    return;
                }
                setLoadError(error.message || 'Failed to load posts');
                notify({ message: error.message || 'Failed to load posts', type: 'error' });
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [paginationModel, notify]);

    const openEdit = (postRow) => {
        setEditingPost(postRow);
        setEditDraft({
            body: postRow.body || '',
            reviewText: postRow.reviewText || '',
            score: postRow.score != null ? String(postRow.score) : '1',
            visibility: postRow.visibility || 'PUBLIC'
        });
    };

    const closeEdit = () => {
        setEditingPost(null);
        setEditDraft({
            body: '',
            reviewText: '',
            score: '1',
            visibility: 'PUBLIC'
        });
    };

    const handleSave = async () => {
        if (!editingPost) {
            return;
        }

        const numericScore = Number(editDraft.score);
        if (!Number.isFinite(numericScore)) {
            notify({ message: 'Score must be a number', type: 'warning' });
            return;
        }

        if (!editDraft.visibility) {
            notify({ message: 'Visibility is required', type: 'warning' });
            return;
        }

        setIsSaving(true);
        try {
            const updatedPost = await BackendApiService.updateAdminPost(editingPost.ratingId, {
                body: normalizeOptional(editDraft.body),
                reviewText: normalizeOptional(editDraft.reviewText),
                score: numericScore,
                visibility: editDraft.visibility
            });

            notify({ message: `Updated post #${updatedPost.ratingId}`, type: 'info' });
            closeEdit();
            await loadPosts(paginationModel);
        } catch (error) {
            notify({ message: error.message || 'Failed to update post', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) {
            return;
        }

        setIsDeleting(true);
        try {
            await BackendApiService.deleteAdminPost(deleteTarget.ratingId);
            notify({ message: `Removed post #${deleteTarget.ratingId}`, type: 'info' });
            setDeleteTarget(null);
            if (editingPost?.ratingId === deleteTarget.ratingId) {
                closeEdit();
            }
            await loadPosts(paginationModel);
        } catch (error) {
            notify({ message: error.message || 'Failed to delete post', type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const selectedPosts = useMemo(
        () => getSelectedRowIds(selectedPostSelectionModel, posts, (post) => post.ratingId)
            .map((postId) => posts.find((post) => post.ratingId === postId))
            .filter(Boolean),
        [posts, selectedPostSelectionModel]
    );

    const handleBulkDeleteSelectedPosts = async () => {
        if (selectedPosts.length === 0) {
            notify({ message: 'Select at least one post first', type: 'warning' });
            return;
        }

        setIsDeletingSelectedPosts(true);
        try {
            const result = await BackendApiService.bulkDeleteAdminPosts(selectedPosts.map((post) => post.ratingId));
            notify({
                message: result.deletedCount > 0
                    ? `Removed ${result.deletedCount} posts`
                    : 'No posts were removed',
                type: 'info'
            });
            setIsBulkDeletePostsOpen(false);
            setSelectedPostSelectionModel(emptySelectionModel);
            await loadPosts(paginationModel);
        } catch (error) {
            notify({ message: error.message || 'Failed to delete selected posts', type: 'error' });
        } finally {
            setIsDeletingSelectedPosts(false);
        }
    };

    const columns = useMemo(() => [
        {
            field: 'ratingId',
            headerName: 'ID',
            width: 90,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'authorUsername',
            headerName: 'Author',
            minWidth: 220,
            flex: 1,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <UserAvatar
                            username={params.row.authorUsername}
                            profilePicUrl={params.row.authorProfilePicUrl}
                            size="sm"
                            alt={params.row.authorUsername || 'Deleted author'}
                        />
                        <Typography variant="body2" fontWeight={700} sx={{ textAlign: 'center' }}>
                            {params.value}
                        </Typography>
                    </Stack>
                </Box>
            )
        },
        {
            field: 'content',
            headerName: 'Content',
            minWidth: 280,
            flex: 1.3,
            renderCell: (params) => {
                const body = params.row.body || params.row.rateableItem?.body || '';
                const reviewText = params.row.reviewText || '';

                return (
                    <Box sx={{ width: '100%', py: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.35 }}>
                            {truncateText(body, 110)}
                        </Typography>
                        {reviewText.trim() && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    lineHeight: 1.35,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}
                            >
                                {truncateText(reviewText, 160)}
                            </Typography>
                        )}
                    </Box>
                );
            }
        },
        {
            field: 'visibility',
            headerName: 'Visibility',
            width: 130,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    color={visibilityChipColor(params.value)}
                    size="small"
                    variant={params.value === 'PUBLIC' ? 'filled' : 'outlined'}
                />
            )
        },
        {
            field: 'deletedAt',
            headerName: 'Status',
            width: 130,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Chip
                    label={params.value ? 'Deleted' : 'Active'}
                    color={params.value ? 'error' : 'success'}
                    size="small"
                    variant={params.value ? 'filled' : 'outlined'}
                />
            )
        },
        {
            field: 'likeCount',
            headerName: 'Likes',
            width: 100,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'score',
            headerName: 'Score',
            width: 110,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'commentCount',
            headerName: 'Comments',
            width: 118,
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
            width: 190,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                                event.stopPropagation();
                                openEdit(params.row);
                            }}
                        >
                            Edit
                        </Button>
                        <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={(event) => {
                                event.stopPropagation();
                                setDeleteTarget(params.row);
                            }}
                        >
                            Remove
                        </Button>
                    </Stack>
                </Box>
            )
        }
    ], [paginationModel, loadPosts, notify]);

    return (
        <Stack spacing={3}>
            <Paper elevation={1} sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="h6" component="h2" gutterBottom>
                            Posts
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Manage feed posts, their content, visibility, and moderation status.
                        </Typography>
                    </Box>

                    {loadError && <Alert severity="error">{loadError}</Alert>}

                    {selectedPosts.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: '#f7f9f9' }}>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1}
                                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    {selectedPosts.length} post{selectedPosts.length === 1 ? '' : 's'} selected
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={() => setIsBulkDeletePostsOpen(true)}
                                    >
                                        Remove selected
                                    </Button>
                                    <Button variant="text" onClick={() => setSelectedPostIds([])}>
                                        Clear selection
                                    </Button>
                                </Stack>
                            </Stack>
                        </Paper>
                    )}

                    {isLoading ? (
                        <Typography color="text.secondary">Loading posts...</Typography>
                    ) : (
                        <AdminDataGrid
                            autoHeight
                            rows={posts}
                            columns={columns}
                            getRowId={(row) => row.ratingId}
                            checkboxSelection
                            disableRowSelectionOnClick
                            disableColumnSorting
                            pagination
                            paginationMode="server"
                            pageSizeOptions={[10, 20, 50]}
                            rowCount={rowCount}
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            loading={isLoading}
                            rowSelectionModel={selectedPostSelectionModel}
                            onRowSelectionModelChange={(selectionModel) => {
                                setSelectedPostSelectionModel(selectionModel || emptySelectionModel);
                            }}
                            localeText={{ noRowsLabel: 'No posts found.' }}
                            onRowClick={(params) => {
                                if (params.field === '__check__') {
                                    return;
                                }

                                openEdit(params.row);
                            }}
                            sx={{
                                '& .MuiDataGrid-row.Mui-selected': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.08)'
                                }
                            }}
                        />
                    )}
                </Stack>
            </Paper>

            <Modal
                isOpen={isBulkDeletePostsOpen}
                title={`Remove ${selectedPosts.length} selected post${selectedPosts.length === 1 ? '' : 's'}`}
                onClose={() => setIsBulkDeletePostsOpen(false)}
            >
                <Stack spacing={2}>
                    <Alert severity="warning">
                        This will replace selected posts with a deleted-post placeholder, remove likes/feed references, and preserve comments.
                    </Alert>
                    <Typography variant="body1">
                        Remove {selectedPosts.length} selected post{selectedPosts.length === 1 ? '' : 's'}?
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        <Button variant="outlined" onClick={() => setIsBulkDeletePostsOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleBulkDeleteSelectedPosts}
                            disabled={isDeletingSelectedPosts}
                        >
                            {isDeletingSelectedPosts ? 'Removing...' : 'Remove selected'}
                        </Button>
                    </Stack>
                </Stack>
            </Modal>

            <Modal
                isOpen={editingPost != null}
                title={editingPost ? `Edit post #${editingPost.ratingId}` : 'Edit post'}
                onClose={closeEdit}
            >
                {editingPost && (
                    <Stack spacing={2}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Stack spacing={1.25}>
                                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                                    <UserAvatar
                                        username={editingPost.authorUsername}
                                        profilePicUrl={editingPost.authorProfilePicUrl}
                                        size="md"
                                        alt={editingPost.authorUsername || 'Deleted author'}
                                    />
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            {editingPost.authorUsername}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {editingPost.itemType} · {formatTimestamp(editingPost.createdAt)}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={2}
                                    useFlexGap
                                    sx={{ flexWrap: 'wrap' }}
                                >
                                    <Box>
                                        <Typography variant="overline" color="text.secondary">
                                            Likes
                                        </Typography>
                                        <Typography variant="body2">{editingPost.likeCount}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="overline" color="text.secondary">
                                            Comments
                                        </Typography>
                                        <Typography variant="body2">{editingPost.commentCount}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="overline" color="text.secondary">
                                            Visibility
                                        </Typography>
                                        <Typography variant="body2">{editingPost.visibility}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="overline" color="text.secondary">
                                            Media
                                        </Typography>
                                        <Typography variant="body2">{editingPost.mediaObjectKey || '—'}</Typography>
                                    </Box>
                                </Stack>
                            </Stack>
                        </Paper>

                        <TextField
                            label="Body"
                            value={editDraft.body}
                            onChange={(event) => setEditDraft((current) => ({
                                ...current,
                                body: event.target.value
                            }))}
                            fullWidth
                            multiline
                            minRows={3}
                        />
                        <TextField
                            label="Review Text"
                            value={editDraft.reviewText}
                            onChange={(event) => setEditDraft((current) => ({
                                ...current,
                                reviewText: event.target.value
                            }))}
                            fullWidth
                            multiline
                            minRows={3}
                        />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                label="Score"
                                type="number"
                                value={editDraft.score}
                                onChange={(event) => setEditDraft((current) => ({
                                    ...current,
                                    score: event.target.value
                                }))}
                                fullWidth
                                slotProps={{
                                    htmlInput: {
                                        min: 1,
                                        max: 5,
                                        step: 0.5
                                    }
                                }}
                            />
                            <FormControl fullWidth>
                                <InputLabel id="admin-post-visibility-label">Visibility</InputLabel>
                                <Select
                                    labelId="admin-post-visibility-label"
                                    label="Visibility"
                                    value={editDraft.visibility}
                                    onChange={(event) => setEditDraft((current) => ({
                                        ...current,
                                        visibility: event.target.value
                                    }))}
                                >
                                    {VISIBILITY_OPTIONS.map((visibility) => (
                                        <MenuItem key={visibility} value={visibility}>
                                            {visibility}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            <Button variant="outlined" onClick={closeEdit}>
                                Cancel
                            </Button>
                            <Button variant="contained" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save changes'}
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </Modal>

            <Modal
                isOpen={deleteTarget != null}
                title={deleteTarget ? `Remove post #${deleteTarget.ratingId}` : 'Remove post'}
                onClose={() => setDeleteTarget(null)}
            >
                {deleteTarget && (
                    <Stack spacing={2}>
                        <Alert severity="warning">
                            This will replace the post with a deleted-post placeholder, remove likes/feed references, and preserve comments.
                        </Alert>
                        <Typography variant="body1">
                            Remove <strong>post #{deleteTarget.ratingId}</strong> by{' '}
                            <strong>{deleteTarget.authorUsername}</strong>?
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            This post has {deleteTarget.likeCount} likes and {deleteTarget.commentCount} comments.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Content: <strong>{truncateText(deleteTarget.body || deleteTarget.rateableItem?.body || '')}</strong>
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
                                {isDeleting ? 'Removing...' : 'Remove post'}
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </Modal>
        </Stack>
    );
};

export default AdminPosts;
