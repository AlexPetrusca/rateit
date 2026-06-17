import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Paper,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import AdminDataGrid from '../components/AdminDataGrid.jsx';
import Modal from '../components/Modal.jsx';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import { formatTimestamp as formatDateTime } from '../utils/dateTime.js';

const JOB_REFRESH_MS = 2000;
const formatTimestamp = (value) => formatDateTime(value, '—');

const statusChipColor = (status) => {
    switch (status) {
        case 'DONE':
            return 'success';
        case 'FAILED':
            return 'error';
        case 'IN_PROGRESS':
            return 'info';
        case 'PENDING':
            return 'warning';
        default:
            return 'default';
    }
};

const AdminJobs = () => {
    const { notify } = useNotifications();
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [selectedJobDetail, setSelectedJobDetail] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [count, setCount] = useState(20);
    const [usernamePrefix, setUsernamePrefix] = useState('test_user');
    const [phonePrefix, setPhonePrefix] = useState('+1555000');
    const [postCount, setPostCount] = useState(20);
    const [postBodyPrefix, setPostBodyPrefix] = useState('');
    const [postReviewPrefix, setPostReviewPrefix] = useState('');
    const [commentCount, setCommentCount] = useState(20);
    const [commentMaxDepth, setCommentMaxDepth] = useState(3);
    const [commentReplyChance, setCommentReplyChance] = useState(0.5);
    const [commentPrefix, setCommentPrefix] = useState('');
    const [commentReplyPrefix, setCommentReplyPrefix] = useState('');
    const [likeCount, setLikeCount] = useState(20);

    const loadJobs = useCallback(async () => {
        const nextJobs = await BackendApiService.getAdminJobs(20);
        setJobs(nextJobs);
        return nextJobs;
    }, []);

    const loadJobDetail = useCallback(async (jobId) => {
        if (jobId == null) {
            setSelectedJobDetail(null);
            setDetailError('');
            return;
        }

        setIsDetailLoading(true);
        setDetailError('');
        try {
            const detail = await BackendApiService.getAdminJob(jobId);
            setSelectedJobDetail(detail);
            return detail;
        } catch (error) {
            setDetailError(error.message || 'Failed to load job details');
            throw error;
        } finally {
            setIsDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        BackendApiService.getAdminJobs(20)
            .then((adminJobs) => {
                if (isMounted) {
                    setJobs(adminJobs);
                }
            })
            .catch((error) => {
                notify({ message: error.message || 'Failed to load jobs', type: 'error' });
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [notify]);

    useEffect(() => {
        if (selectedJobId == null) {
            setSelectedJobDetail(null);
            setIsDetailLoading(false);
            setDetailError('');
            return undefined;
        }

        let isMounted = true;
        loadJobDetail(selectedJobId).catch((error) => {
            if (!isMounted) {
                return;
            }
            notify({ message: error.message || 'Failed to load job details', type: 'error' });
        });

        return () => {
            isMounted = false;
        };
    }, [selectedJobId, loadJobDetail, notify]);

    useEffect(() => {
        const hasActiveJob = jobs.some((job) => job.status === 'PENDING' || job.status === 'IN_PROGRESS');
        if (!hasActiveJob) {
            return undefined;
        }

        const timer = setInterval(() => {
            loadJobs().catch((error) => {
                notify({ message: error.message || 'Failed to refresh jobs', type: 'error' });
            });
        }, JOB_REFRESH_MS);

        return () => clearInterval(timer);
    }, [jobs, loadJobs, notify]);

    const handleCreateUsersJob = async () => {
        if (!Number.isInteger(Number(count)) || Number(count) < 1) {
            notify({ message: 'Count must be at least 1', type: 'warning' });
            return;
        }

        setIsSubmitting(true);
        try {
            const job = await BackendApiService.createUsersJob({
                count: Number(count),
                usernamePrefix,
                phonePrefix
            });
            notify({ message: `Queued job #${job.id}`, type: 'info' });
            await loadJobs();
            setSelectedJobId(job.id);
            setIsDetailOpen(true);
        } catch (error) {
            if (error.status !== 403) {
                notify({ message: error.message || 'Failed to queue job', type: 'error' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreatePostsJob = async () => {
        if (!Number.isInteger(Number(postCount)) || Number(postCount) < 1) {
            notify({ message: 'Count must be at least 1', type: 'warning' });
            return;
        }

        setIsSubmitting(true);
        try {
            const job = await BackendApiService.createPostsJob({
                count: Number(postCount),
                bodyPrefix: postBodyPrefix,
                reviewPrefix: postReviewPrefix
            });
            notify({ message: `Queued job #${job.id}`, type: 'info' });
            await loadJobs();
            setSelectedJobId(job.id);
            setIsDetailOpen(true);
        } catch (error) {
            if (error.status !== 403) {
                notify({ message: error.message || 'Failed to queue job', type: 'error' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateCommentsJob = async () => {
        if (!Number.isInteger(Number(commentCount)) || Number(commentCount) < 1) {
            notify({ message: 'Count must be at least 1', type: 'warning' });
            return;
        }

        const normalizedReplyChance = Number(commentReplyChance);
        if (!Number.isFinite(normalizedReplyChance) || normalizedReplyChance < 0 || normalizedReplyChance > 1) {
            notify({ message: 'Reply chance must be between 0 and 1', type: 'warning' });
            return;
        }

        if (!Number.isInteger(Number(commentMaxDepth)) || Number(commentMaxDepth) < 1) {
            notify({ message: 'Max depth must be at least 1', type: 'warning' });
            return;
        }

        setIsSubmitting(true);
        try {
            const job = await BackendApiService.createCommentsJob({
                count: Number(commentCount),
                maxDepth: Number(commentMaxDepth),
                replyChance: normalizedReplyChance,
                commentPrefix,
                replyPrefix: commentReplyPrefix
            });
            notify({ message: `Queued job #${job.id}`, type: 'info' });
            await loadJobs();
            setSelectedJobId(job.id);
            setIsDetailOpen(true);
        } catch (error) {
            if (error.status !== 403) {
                notify({ message: error.message || 'Failed to queue comment job', type: 'error' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateLikesJob = async () => {
        if (!Number.isInteger(Number(likeCount)) || Number(likeCount) < 1) {
            notify({ message: 'Count must be at least 1', type: 'warning' });
            return;
        }

        setIsSubmitting(true);
        try {
            const job = await BackendApiService.createLikesJob({ count: Number(likeCount) });
            notify({ message: `Queued job #${job.id}`, type: 'info' });
            await loadJobs();
            setSelectedJobId(job.id);
            setIsDetailOpen(true);
        } catch (error) {
            if (error.status !== 403) {
                notify({ message: error.message || 'Failed to queue like job', type: 'error' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const openJobDetail = (jobId) => {
        setSelectedJobId(jobId);
        setIsDetailOpen(true);
    };

    const closeJobDetail = () => {
        setIsDetailOpen(false);
        setSelectedJobId(null);
        setSelectedJobDetail(null);
        setIsDetailLoading(false);
        setDetailError('');
    };

    const activeJobs = useMemo(
        () => jobs.filter((job) => job.status === 'PENDING' || job.status === 'IN_PROGRESS'),
        [jobs]
    );

    const selectedJob = useMemo(
        () => jobs.find((job) => job.id === selectedJobId) || null,
        [jobs, selectedJobId]
    );

    const jobColumns = useMemo(() => [
        {
            field: 'id',
            headerName: 'Job',
            width: 92,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Typography variant="body2" fontWeight={700} sx={{ width: '100%', textAlign: 'center' }}>
                    #{params.value}
                </Typography>
            )
        },
        {
            field: 'jobType',
            headerName: 'Type',
            width: 170,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 130,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    color={statusChipColor(params.value)}
                    size="small"
                    variant={params.value === 'DONE' ? 'filled' : 'outlined'}
                />
            )
        },
        {
            field: 'description',
            headerName: 'Description',
            flex: 1,
            minWidth: 220,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'resultSummary',
            headerName: 'Summary',
            flex: 1,
            minWidth: 220,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => params.value || '—'
        },
        {
            field: 'errorMessage',
            headerName: 'Error',
            flex: 1,
            minWidth: 220,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => params.value || '—'
        },
        {
            field: 'createdAt',
            headerName: 'Queued',
            width: 160,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => formatTimestamp(params.value)
        },
        {
            field: 'startedAt',
            headerName: 'Started',
            width: 160,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => formatTimestamp(params.value)
        },
        {
            field: 'finishedAt',
            headerName: 'Finished',
            width: 160,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => formatTimestamp(params.value)
        }
    ], []);

    const createdUserColumns = useMemo(() => [
        {
            field: 'username',
            headerName: 'Username',
            flex: 1,
            minWidth: 180,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Typography variant="body2" fontWeight={700} sx={{ width: '100%', textAlign: 'center' }}>
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'phoneNumber',
            headerName: 'Phone Number',
            flex: 1,
            minWidth: 180,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'role',
            headerName: 'Role',
            width: 140,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Chip label={params.value} size="small" variant="outlined" />
            )
        }
    ], []);

    const createdPostColumns = useMemo(() => [
        {
            field: 'authorUsername',
            headerName: 'Author',
            width: 160,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'score',
            headerName: 'Score',
            width: 120,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'reviewText',
            headerName: 'Review',
            flex: 1,
            minWidth: 220,
            align: 'center',
            headerAlign: 'center'
        }
    ], []);

    const createdCommentColumns = useMemo(() => [
        {
            field: 'authorUsername',
            headerName: 'Author',
            width: 160,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'ratingId',
            headerName: 'Post',
            width: 110,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => `#${params.value}`
        },
        {
            field: 'parentCommentId',
            headerName: 'Parent',
            width: 110,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (params.value ? `#${params.value}` : 'Root')
        },
        {
            field: 'score',
            headerName: 'Score',
            width: 100,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'text',
            headerName: 'Comment',
            flex: 1,
            minWidth: 260,
            align: 'center',
            headerAlign: 'center'
        }
    ], []);

    const createdLikeColumns = useMemo(() => [
        {
            field: 'authorUsername',
            headerName: 'User',
            width: 160,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'ratingId',
            headerName: 'Post',
            width: 110,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => `#${params.value}`
        },
        {
            field: 'createdAt',
            headerName: 'Liked At',
            width: 170,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => formatTimestamp(params.value)
        }
    ], []);

    const createdUserRows = selectedJobDetail?.createdUsers || [];
    const createdCommentRows = selectedJobDetail?.createdComments || [];
    const createdLikeRows = selectedJobDetail?.createdLikes || [];

    return (
        <Stack spacing={3}>
            <Paper elevation={1} sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                    <Box>
                        <Typography variant="h6" component="h2" gutterBottom>
                            Automation
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Queues a background job.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gap: 2,
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: '180px minmax(220px, 1fr) minmax(220px, 1fr)'
                            }
                        }}
                    >
                        <TextField
                            id="admin-user-count"
                            label="Count"
                            type="number"
                            slotProps={{ htmlInput: { min: 1 } }}
                            value={count}
                            onChange={(event) => setCount(event.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            id="admin-username-prefix"
                            label="Username Prefix"
                            helperText="Prepended to each generated username."
                            value={usernamePrefix}
                            onChange={(event) => setUsernamePrefix(event.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            id="admin-phone-prefix"
                            label="Phone Prefix"
                            helperText="Prepended to each generated test phone number."
                            value={phonePrefix}
                            onChange={(event) => setPhonePrefix(event.target.value)}
                            fullWidth
                            size="small"
                        />
                    </Box>

                    <Box>
                        <Button variant="contained" onClick={handleCreateUsersJob} disabled={isSubmitting}>
                            {isSubmitting ? 'Queueing...' : 'Queue User Job'}
                        </Button>
                    </Box>
                </Stack>
            </Paper>

            <Paper elevation={1} sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                    <Box>
                        <Typography variant="h6" component="h2" gutterBottom>
                            Create Comments
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Generates threaded comments from active test users on public posts. Replies will chain up to the configured depth.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gap: 2,
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: '180px repeat(4, minmax(180px, 1fr))'
                            }
                        }}
                    >
                        <TextField
                            id="admin-comment-count"
                            label="Count"
                            type="number"
                            slotProps={{ htmlInput: { min: 1 } }}
                            value={commentCount}
                            onChange={(event) => setCommentCount(event.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            id="admin-comment-max-depth"
                            label="Max Depth"
                            type="number"
                            helperText="How deep threaded replies can go."
                            slotProps={{ htmlInput: { min: 1 } }}
                            value={commentMaxDepth}
                            onChange={(event) => setCommentMaxDepth(event.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            id="admin-comment-reply-chance"
                            label="Reply Chance"
                            type="number"
                            helperText="0 to 1. Higher means more replies."
                            slotProps={{ htmlInput: { min: 0, max: 1, step: 0.05 } }}
                            value={commentReplyChance}
                            onChange={(event) => setCommentReplyChance(event.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            id="admin-comment-prefix"
                            label="Comment Prefix"
                            helperText="Prepended to root comments."
                            value={commentPrefix}
                            onChange={(event) => setCommentPrefix(event.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            id="admin-comment-reply-prefix"
                            label="Reply Prefix"
                            helperText="Prepended to reply comments."
                            value={commentReplyPrefix}
                            onChange={(event) => setCommentReplyPrefix(event.target.value)}
                            fullWidth
                            size="small"
                        />
                    </Box>

                    <Box>
                        <Button variant="contained" onClick={handleCreateCommentsJob} disabled={isSubmitting}>
                            {isSubmitting ? 'Queueing...' : 'Queue Comment Job'}
                        </Button>
                    </Box>
                </Stack>
            </Paper>

            <Paper elevation={1} sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                    <Box>
                        <Typography variant="h6" component="h2" gutterBottom>
                            Create Likes
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Generates likes from active test users on public posts. Existing likes are skipped.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gap: 2,
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: '180px'
                            }
                        }}
                    >
                        <TextField
                            id="admin-like-count"
                            label="Count"
                            type="number"
                            slotProps={{ htmlInput: { min: 1 } }}
                            value={likeCount}
                            onChange={(event) => setLikeCount(event.target.value)}
                            fullWidth
                            size="small"
                        />
                    </Box>

                    <Box>
                        <Button variant="contained" onClick={handleCreateLikesJob} disabled={isSubmitting}>
                            {isSubmitting ? 'Queueing...' : 'Queue Like Job'}
                        </Button>
                    </Box>
                </Stack>
            </Paper>

            <Paper elevation={1} sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                    <Box>
                        <Typography variant="h6" component="h2" gutterBottom>
                            Create Posts
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Generates test posts from active test users with randomized bodies, review text, and scores.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gap: 2,
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: '180px repeat(2, minmax(220px, 1fr))'
                            }
                        }}
                    >
                        <TextField
                            id="admin-post-count"
                            label="Count"
                            type="number"
                            slotProps={{ htmlInput: { min: 1 } }}
                            value={postCount}
                            onChange={(event) => setPostCount(event.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            id="admin-post-body-prefix"
                            label="Body Prefix"
                            helperText="Prepended to the generated post body."
                            value={postBodyPrefix}
                            onChange={(event) => setPostBodyPrefix(event.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            id="admin-post-review-prefix"
                            label="Review Prefix"
                            helperText="Prepended to the generated review text."
                            value={postReviewPrefix}
                            onChange={(event) => setPostReviewPrefix(event.target.value)}
                            fullWidth
                            size="small"
                        />
                    </Box>

                    <Box>
                        <Button variant="contained" onClick={handleCreatePostsJob} disabled={isSubmitting}>
                            {isSubmitting ? 'Queueing...' : 'Queue Post Job'}
                        </Button>
                    </Box>
                </Stack>
            </Paper>

            <Paper elevation={1} sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                    <Box>
                        <Typography variant="h6" component="h2" gutterBottom>
                            Job Queue
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {activeJobs.length} active, {jobs.length} total
                        </Typography>
                    </Box>

                    {isLoading ? (
                        <Typography color="text.secondary">Loading jobs...</Typography>
                    ) : (
                        <AdminDataGrid
                            autoHeight
                            rows={jobs}
                            columns={jobColumns}
                            disableRowSelectionOnClick
                            hideFooter
                            localeText={{ noRowsLabel: 'No jobs queued yet.' }}
                            onRowClick={(params) => openJobDetail(params.id)}
                            getRowClassName={(params) => (
                                params.id === selectedJobId ? 'Mui-selected' : ''
                            )}
                            initialState={{
                                sorting: {
                                    sortModel: [{ field: 'createdAt', sort: 'desc' }]
                                }
                            }}
                            sx={{
                                '& .MuiDataGrid-row': {
                                    cursor: 'pointer'
                                },
                                '& .MuiDataGrid-row.Mui-selected': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.08)'
                                }
                            }}
                        />
                    )}
                </Stack>
            </Paper>

            <Modal
                isOpen={isDetailOpen}
                title={selectedJob ? `Job #${selectedJob.id}` : 'Job details'}
                onClose={closeJobDetail}
            >
                {isDetailLoading ? (
                <Stack sx={{ py: 4, justifyContent: 'center', alignItems: 'center' }}>
                        <Typography color="text.secondary">Loading job details...</Typography>
                    </Stack>
                ) : detailError ? (
                    <Alert severity="error">{detailError}</Alert>
                ) : selectedJobDetail ? (
                    <Stack spacing={2}>
                        <Typography variant="body1" color="text.primary">
                            {selectedJobDetail.narrative}
                        </Typography>

                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                useFlexGap
                                sx={{ flexWrap: 'wrap' }}
                            >
                                <Box>
                                    <Typography variant="overline" color="text.secondary">
                                        Status
                                    </Typography>
                                    <Typography variant="body2">{selectedJobDetail.status}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="overline" color="text.secondary">
                                        Queued
                                    </Typography>
                                    <Typography variant="body2">{formatTimestamp(selectedJobDetail.createdAt)}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="overline" color="text.secondary">
                                        Started
                                    </Typography>
                                    <Typography variant="body2">{formatTimestamp(selectedJobDetail.startedAt)}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="overline" color="text.secondary">
                                        Finished
                                    </Typography>
                                    <Typography variant="body2">{formatTimestamp(selectedJobDetail.finishedAt)}</Typography>
                                </Box>
                            </Stack>
                        </Paper>

                        {selectedJobDetail.createUsersRequest && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" component="h3" gutterBottom>
                                    Planned config
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Create {selectedJobDetail.createUsersRequest.count} users with username prefix{' '}
                                    <strong>{selectedJobDetail.createUsersRequest.usernamePrefix}</strong> and phone prefix{' '}
                                    <strong>{selectedJobDetail.createUsersRequest.phonePrefix}</strong>.
                                </Typography>
                            </Paper>
                        )}

                        {selectedJobDetail.createPostsRequest && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" component="h3" gutterBottom>
                                    Planned config
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Create {selectedJobDetail.createPostsRequest.count} posts with body prefix{' '}
                                    <strong>{selectedJobDetail.createPostsRequest.bodyPrefix || 'None'}</strong>, and review prefix{' '}
                                    <strong>{selectedJobDetail.createPostsRequest.reviewPrefix || 'None'}</strong>.
                                </Typography>
                            </Paper>
                        )}

                        {selectedJobDetail.createCommentsRequest && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" component="h3" gutterBottom>
                                    Planned config
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Create {selectedJobDetail.createCommentsRequest.count} comments with max depth{' '}
                                    <strong>{selectedJobDetail.createCommentsRequest.maxDepth}</strong>, reply chance{' '}
                                    <strong>{Number(selectedJobDetail.createCommentsRequest.replyChance).toFixed(2)}</strong>, comment prefix{' '}
                                    <strong>{selectedJobDetail.createCommentsRequest.commentPrefix || 'None'}</strong>, and reply prefix{' '}
                                    <strong>{selectedJobDetail.createCommentsRequest.replyPrefix || 'None'}</strong>.
                                </Typography>
                            </Paper>
                        )}

                        {selectedJobDetail.createLikesRequest && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" component="h3" gutterBottom>
                                    Planned config
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Create {selectedJobDetail.createLikesRequest.count} likes from active test users on public posts.
                                </Typography>
                            </Paper>
                        )}

                        {createdUserRows.length > 0 && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" component="h3" gutterBottom>
                                    Created users
                                </Typography>
                                <AdminDataGrid
                                    autoHeight
                                    rows={createdUserRows}
                                    columns={createdUserColumns}
                                    getRowId={(row) => row.userId}
                                    hideFooter
                                    disableRowSelectionOnClick
                                />
                            </Paper>
                        )}

                        {selectedJobDetail.createdPosts?.length > 0 && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" component="h3" gutterBottom>
                                    Created posts
                                </Typography>
                                <AdminDataGrid
                                    autoHeight
                                    rows={selectedJobDetail.createdPosts}
                                    columns={createdPostColumns}
                                    getRowId={(row) => row.ratingId}
                                    hideFooter
                                    disableRowSelectionOnClick
                                />
                            </Paper>
                        )}

                        {createdCommentRows.length > 0 && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" component="h3" gutterBottom>
                                    Created comments
                                </Typography>
                                <AdminDataGrid
                                    autoHeight
                                    rows={createdCommentRows}
                                    columns={createdCommentColumns}
                                    getRowId={(row) => row.commentId}
                                    hideFooter
                                    disableRowSelectionOnClick
                                />
                            </Paper>
                        )}

                        {createdLikeRows.length > 0 && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" component="h3" gutterBottom>
                                    Created likes
                                </Typography>
                                <AdminDataGrid
                                    autoHeight
                                    rows={createdLikeRows}
                                    columns={createdLikeColumns}
                                    getRowId={(row) => row.likeId}
                                    hideFooter
                                    disableRowSelectionOnClick
                                />
                            </Paper>
                        )}

                        {selectedJobDetail.resultSummary && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" component="h3" gutterBottom>
                                    Summary
                                </Typography>
                                <Typography variant="body2">{selectedJobDetail.resultSummary}</Typography>
                            </Paper>
                        )}

                        {selectedJobDetail.errorMessage && (
                            <Alert severity="error">{selectedJobDetail.errorMessage}</Alert>
                        )}
                    </Stack>
                ) : (
                    <Typography color="text.secondary">No job selected.</Typography>
                )}
            </Modal>
        </Stack>
    );
};

export default AdminJobs;
