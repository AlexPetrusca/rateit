import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Paper,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import AdminDataGrid from '../components/AdminDataGrid.jsx';
import AdminSelectionToolbar from '../components/AdminSelectionToolbar.jsx';
import Modal from '../components/Modal.jsx';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import { emptySelectionModel, getSelectedRowIds } from '../utils/adminSelection.js';
import { formatTimestamp } from '../utils/dateTime.js';
import { truncateText } from '../utils/textDisplay.js';

const DEFAULT_PAGE_SIZE = 10;

const getCommentId = (comment) => comment.commentId ?? comment.id;

const AdminComments = () => {
    const { notify } = useNotifications();
    const [comments, setComments] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [editingComment, setEditingComment] = useState(null);
    const [editDraft, setEditDraft] = useState({ text: '', score: '1' });
    const [isSaving, setIsSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedCommentSelectionModel, setSelectedCommentSelectionModel] = useState(emptySelectionModel);
    const [isBulkDeleteCommentsOpen, setIsBulkDeleteCommentsOpen] = useState(false);
    const [isDeletingSelectedComments, setIsDeletingSelectedComments] = useState(false);

    const loadComments = useCallback(async (nextPaginationModel = paginationModel) => {
        setIsLoading(true);
        setLoadError('');

        try {
            const page = await BackendApiService.getAdminComments({
                page: nextPaginationModel.page,
                size: nextPaginationModel.pageSize
            });
            const nextRows = page.content || [];
            setComments(nextRows);
            setRowCount(page.totalElements || 0);
            setSelectedCommentSelectionModel(emptySelectionModel);

            if (nextPaginationModel.page > 0 && nextRows.length === 0 && (page.totalElements || 0) > 0) {
                setPaginationModel((current) => ({
                    ...current,
                    page: Math.max(0, current.page - 1)
                }));
            }
        } catch (error) {
            setLoadError(error.message || 'Failed to load comments');
            notify({ message: error.message || 'Failed to load comments', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [notify, paginationModel]);

    useEffect(() => {
        loadComments(paginationModel);
    }, [loadComments, paginationModel]);

    const openEdit = (commentRow) => {
        setEditingComment(commentRow);
        setEditDraft({
            text: commentRow.text || '',
            score: commentRow.score != null ? String(commentRow.score) : '1'
        });
    };

    const closeEdit = () => {
        setEditingComment(null);
        setEditDraft({ text: '', score: '1' });
    };

    const handleSave = async () => {
        if (!editingComment) {
            return;
        }

        const numericScore = Number(editDraft.score);
        if (!editDraft.text.trim()) {
            notify({ message: 'Comment text is required', type: 'warning' });
            return;
        }

        if (!Number.isFinite(numericScore)) {
            notify({ message: 'Score must be a number', type: 'warning' });
            return;
        }

        setIsSaving(true);
        try {
            const commentId = getCommentId(editingComment);
            await BackendApiService.updateAdminComment(commentId, {
                text: editDraft.text.trim(),
                score: numericScore
            });
            notify({ message: `Updated comment #${commentId}`, type: 'info' });
            closeEdit();
            await loadComments(paginationModel);
        } catch (error) {
            notify({ message: error.message || 'Failed to update comment', type: 'error' });
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
            const commentId = getCommentId(deleteTarget);
            await BackendApiService.deleteAdminComment(commentId);
            notify({ message: `Deleted comment #${commentId}`, type: 'info' });
            setDeleteTarget(null);
            await loadComments(paginationModel);
        } catch (error) {
            notify({ message: error.message || 'Failed to delete comment', type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const selectedComments = useMemo(
        () => getSelectedRowIds(selectedCommentSelectionModel, comments, getCommentId)
            .map((commentId) => comments.find((comment) => getCommentId(comment) === commentId))
            .filter(Boolean),
        [comments, selectedCommentSelectionModel]
    );

    const handleBulkDeleteSelectedComments = async () => {
        if (selectedComments.length === 0) {
            notify({ message: 'Select at least one comment first', type: 'warning' });
            return;
        }

        setIsDeletingSelectedComments(true);
        try {
            const result = await BackendApiService.bulkDeleteAdminComments(selectedComments.map(getCommentId));
            notify({
                message: result.deletedCount > 0
                    ? `Deleted ${result.deletedCount} comments`
                    : 'No comments were deleted',
                type: 'info'
            });
            setIsBulkDeleteCommentsOpen(false);
            setSelectedCommentSelectionModel(emptySelectionModel);
            await loadComments(paginationModel);
        } catch (error) {
            notify({ message: error.message || 'Failed to delete selected comments', type: 'error' });
        } finally {
            setIsDeletingSelectedComments(false);
        }
    };

    const columns = useMemo(() => [
        {
            field: 'commentId',
            headerName: 'ID',
            width: 90,
            align: 'center',
            headerAlign: 'center',
            valueGetter: (_value, row) => getCommentId(row)
        },
        {
            field: 'ratingId',
            headerName: 'Post',
            width: 100,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'parentCommentId',
            headerName: 'Parent',
            width: 110,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => params.value || '-'
        },
        {
            field: 'authorUsername',
            headerName: 'Author',
            minWidth: 170,
            flex: 0.7,
            align: 'center',
            headerAlign: 'center',
            valueGetter: (_value, row) => row.authorUsername ?? row.author?.username ?? '-'
        },
        {
            field: 'content',
            headerName: 'Content',
            minWidth: 260,
            flex: 1.4,
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
                        {truncateText(params.row.text, 180)}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'score',
            headerName: 'Score',
            width: 100,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => params.value ?? '-'
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
                    <Stack direction="row" spacing={1}>
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
    ], []);

    return (
        <Stack spacing={3}>
            <Paper elevation={1} sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="h6" component="h2" gutterBottom>
                            Comments
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Moderate threaded comments and their scores.
                        </Typography>
                    </Box>

                    {loadError && <Alert severity="error">{loadError}</Alert>}

                    <AdminSelectionToolbar
                        count={selectedComments.length}
                        itemName="comment"
                        onAction={() => setIsBulkDeleteCommentsOpen(true)}
                        onClear={() => setSelectedCommentSelectionModel(emptySelectionModel)}
                    />

                    <AdminDataGrid
                        autoHeight
                        rows={comments}
                        columns={columns}
                        getRowId={getCommentId}
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
                        rowSelectionModel={selectedCommentSelectionModel}
                        onRowSelectionModelChange={(selectionModel) => {
                            setSelectedCommentSelectionModel(selectionModel || emptySelectionModel);
                        }}
                        localeText={{ noRowsLabel: 'No comments found.' }}
                        onRowClick={(params) => {
                            if (params.field === '__check__') {
                                return;
                            }

                            openEdit(params.row);
                        }}
                    />
                </Stack>
            </Paper>

            <Modal
                isOpen={editingComment != null}
                title={editingComment ? `Edit comment #${getCommentId(editingComment)}` : 'Edit comment'}
                onClose={closeEdit}
            >
                {editingComment && (
                    <Stack spacing={2}>
                        <TextField
                            label="Comment"
                            value={editDraft.text}
                            onChange={(event) => setEditDraft((current) => ({
                                ...current,
                                text: event.target.value
                            }))}
                            fullWidth
                            multiline
                            minRows={3}
                        />
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
                                    min: 0.5,
                                    max: 5,
                                    step: 0.5
                                }
                            }}
                        />
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
                title={deleteTarget ? `Delete comment #${getCommentId(deleteTarget)}` : 'Delete comment'}
                onClose={() => setDeleteTarget(null)}
            >
                {deleteTarget && (
                    <Stack spacing={2}>
                    <Alert severity="warning">
                        This will delete the selected comment.
                    </Alert>
                    <Typography variant="body1">
                        Delete comment #{getCommentId(deleteTarget)}?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Content: <strong>{truncateText(deleteTarget.text, 180)}</strong>
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
                                {isDeleting ? 'Deleting...' : 'Delete comment'}
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </Modal>

            <Modal
                isOpen={isBulkDeleteCommentsOpen}
                title={`Delete ${selectedComments.length} selected comment${selectedComments.length === 1 ? '' : 's'}`}
                onClose={() => setIsBulkDeleteCommentsOpen(false)}
            >
                <Stack spacing={2}>
                    <Alert severity="warning">
                        This will delete the selected comments.
                    </Alert>
                    <Typography variant="body1">
                        Delete {selectedComments.length} selected comment{selectedComments.length === 1 ? '' : 's'}?
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        <Button variant="outlined" onClick={() => setIsBulkDeleteCommentsOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleBulkDeleteSelectedComments}
                            disabled={isDeletingSelectedComments}
                        >
                            {isDeletingSelectedComments ? 'Deleting...' : 'Delete selected'}
                        </Button>
                    </Stack>
                </Stack>
            </Modal>
        </Stack>
    );
};

export default AdminComments;
