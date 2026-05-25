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

const JOB_REFRESH_MS = 2000;

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

    const createdUserRows = selectedJobDetail?.createdUsers || [];

    return (
        <Stack spacing={3}>
            <Paper elevation={1} sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                    <Box>
                        <Typography variant="h6" component="h2" gutterBottom>
                            Create Users
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
                            value={usernamePrefix}
                            onChange={(event) => setUsernamePrefix(event.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            id="admin-phone-prefix"
                            label="Phone Prefix"
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
