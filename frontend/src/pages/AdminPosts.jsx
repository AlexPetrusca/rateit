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

const AdminPosts = () => {
    const { notify } = useNotifications();
    const [posts, setPosts] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [editingPost, setEditingPost] = useState(null);
    const [editDraft, setEditDraft] = useState({
        title: '',
        body: '',
        reviewText: '',
        score: '1',
        visibility: 'PUBLIC'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedPostIds, setSelectedPostIds] = useState([]);
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
            setSelectedPostIds([]);

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
                setSelectedPostIds([]);

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
            title: postRow.title || '',
            body: postRow.body || '',
            reviewText: postRow.reviewText || '',
            score: postRow.score != null ? String(postRow.score) : '1',
            visibility: postRow.visibility || 'PUBLIC'
        });
    };

    const closeEdit = () => {
        setEditingPost(null);
        setEditDraft({
            title: '',
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
                title: normalizeOptional(editDraft.title),
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
            notify({ message: `Deleted post #${deleteTarget.ratingId}`, type: 'info' });
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
        () => posts.filter((post) => selectedPostIds.includes(post.ratingId)),
        [posts, selectedPostIds]
    );

    const selectedPostSelectionModel = useMemo(() => ({
        type: 'include',
        ids: new Set(selectedPostIds)
    }), [selectedPostIds]);

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
                    ? `Deleted ${result.deletedCount} posts`
                    : 'No posts were deleted',
                type: 'info'
            });
            setIsBulkDeletePostsOpen(false);
            setSelectedPostIds([]);
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
            field: 'title',
            headerName: 'Title',
            minWidth: 220,
            flex: 1.1,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Typography variant="body2" sx={{ width: '100%', textAlign: 'center' }} noWrap title={params.value || ''}>
                    {params.value || '—'}
                </Typography>
            )
        },
        {
            field: 'itemType',
            headerName: 'Type',
            width: 140,
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
            field: 'likeCount',
            headerName: 'Likes',
            width: 100,
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
                            Delete
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
                            Manage feed posts, their content, visibility, and deletion.
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
                                        Delete selected
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
                                setSelectedPostIds(Array.from(selectionModel?.ids || []));
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
                title={`Delete ${selectedPosts.length} selected post${selectedPosts.length === 1 ? '' : 's'}`}
                onClose={() => setIsBulkDeletePostsOpen(false)}
            >
                <Stack spacing={2}>
                    <Alert severity="warning">
                        This will delete the selected posts and their dependent rows.
                    </Alert>
                    <Typography variant="body1">
                        Delete {selectedPosts.length} selected post{selectedPosts.length === 1 ? '' : 's'}?
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
                            {isDeletingSelectedPosts ? 'Deleting...' : 'Delete selected'}
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
                            label="Title"
                            value={editDraft.title}
                            onChange={(event) => setEditDraft((current) => ({
                                ...current,
                                title: event.target.value
                            }))}
                            fullWidth
                        />
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
                title={deleteTarget ? `Delete post #${deleteTarget.ratingId}` : 'Delete post'}
                onClose={() => setDeleteTarget(null)}
            >
                {deleteTarget && (
                    <Stack spacing={2}>
                        <Alert severity="warning">
                            This will delete the post, its comments, its likes, and related audit rows.
                        </Alert>
                        <Typography variant="body1">
                            Delete <strong>{deleteTarget.title || `post #${deleteTarget.ratingId}`}</strong> by{' '}
                            <strong>{deleteTarget.authorUsername}</strong>?
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            This post has {deleteTarget.likeCount} likes and {deleteTarget.commentCount} comments.
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
                                {isDeleting ? 'Deleting...' : 'Delete post'}
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </Modal>
        </Stack>
    );
};

export default AdminPosts;
