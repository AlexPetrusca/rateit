import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

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

const Admin = () => {
    const { user } = useAuth();
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
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

        Promise.all([
            BackendApiService.getAdminStatus(),
            BackendApiService.getAdminJobs(20)
        ])
            .then(([adminStatus, adminJobs]) => {
                if (!isMounted) {
                    return;
                }
                setStatus(adminStatus);
                setJobs(adminJobs);
            })
            .catch((error) => {
                notify({ message: error.message || 'Failed to load admin data', type: 'error' });
                if (error.status === 403) {
                    navigate('/');
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [navigate, notify]);

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
    }, [selectedJobId, jobs, loadJobDetail, notify]);

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

    return (
        <div className="feed-page">
            <main className="twitter-shell">
                <div className="timeline-header">
                    <h1>Admin</h1>
                </div>

                {isLoading ? (
                    <p className="feed-status">Loading admin data...</p>
                ) : (
                    <section className="admin-panel">
                        <div className="admin-summary">
                            <p className="feed-muted">
                                Current role: <strong>{user?.role || 'ROLE_USER'}</strong>
                            </p>
                            {status && (
                                <p className="feed-muted">
                                    Current account: <strong>{status.username}</strong> ({status.phoneNumber})
                                </p>
                            )}
                        </div>

                        <section className="admin-card">
                            <div className="admin-card-header">
                                <h2>Create Users</h2>
                                <span className="admin-card-subtitle">Queues a background job</span>
                            </div>

                            <div className="admin-form-grid">
                                <div className="form-group">
                                    <label htmlFor="admin-user-count">Count</label>
                                    <input
                                        id="admin-user-count"
                                        type="number"
                                        min="1"
                                        value={count}
                                        onChange={(event) => setCount(event.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="admin-username-prefix">Username Prefix</label>
                                    <input
                                        id="admin-username-prefix"
                                        type="text"
                                        value={usernamePrefix}
                                        onChange={(event) => setUsernamePrefix(event.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="admin-phone-prefix">Phone Prefix</label>
                                    <input
                                        id="admin-phone-prefix"
                                        type="text"
                                        value={phonePrefix}
                                        onChange={(event) => setPhonePrefix(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="admin-actions">
                                <button type="button" onClick={handleCreateUsersJob} disabled={isSubmitting}>
                                    {isSubmitting ? 'Queueing...' : 'Queue User Job'}
                                </button>
                            </div>
                        </section>

                        <section className="admin-card">
                            <div className="admin-card-header">
                                <h2>Job Queue</h2>
                                <span className="admin-card-subtitle">
                                    {activeJobs.length} active, {jobs.length} total
                                </span>
                            </div>

                            <div className="job-list">
                                {jobs.length === 0 ? (
                                    <p className="feed-muted">No jobs queued yet.</p>
                                ) : (
                                    jobs.map((job) => (
                                        <button
                                            key={job.id}
                                            type="button"
                                            className={selectedJobId === job.id ? 'job-row job-row-button is-selected' : 'job-row job-row-button'}
                                            onClick={() => openJobDetail(job.id)}
                                        >
                                            <div className="job-row-main">
                                                <div className="job-row-title">
                                                    <strong>#{job.id}</strong>
                                                    <span>{job.jobType}</span>
                                                </div>
                                                <p className="job-row-description">{job.description}</p>
                                                {job.resultSummary && (
                                                    <p className="job-row-result">{job.resultSummary}</p>
                                                )}
                                                {job.errorMessage && (
                                                    <p className="job-row-error">{job.errorMessage}</p>
                                                )}
                                            </div>

                                            <div className="job-row-meta">
                                                <span className={selectedJobId === job.id ? 'job-status job-status-selected' : `job-status job-status-${String(job.status || '').toLowerCase()}`}>
                                                    {job.status}
                                                </span>
                                                <span>Queued {formatTimestamp(job.createdAt)}</span>
                                                <span>Started {formatTimestamp(job.startedAt)}</span>
                                                <span>Finished {formatTimestamp(job.finishedAt)}</span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </section>
                    </section>
                )}
            </main>

            <Modal
                isOpen={isDetailOpen}
                title={selectedJob ? `Job #${selectedJob.id}` : 'Job details'}
                onClose={closeJobDetail}
            >
                {isDetailLoading ? (
                    <p className="feed-status">Loading job details...</p>
                ) : detailError ? (
                    <p className="admin-detail-error">{detailError}</p>
                ) : selectedJobDetail ? (
                    <div className="admin-detail">
                        <p className="admin-detail-narrative">{selectedJobDetail.narrative}</p>

                        <div className="admin-detail-meta">
                            <div>
                                <span className="admin-label">Status</span>
                                <div>{selectedJobDetail.status}</div>
                            </div>
                            <div>
                                <span className="admin-label">Queued</span>
                                <div>{formatTimestamp(selectedJobDetail.createdAt)}</div>
                            </div>
                            <div>
                                <span className="admin-label">Started</span>
                                <div>{formatTimestamp(selectedJobDetail.startedAt)}</div>
                            </div>
                            <div>
                                <span className="admin-label">Finished</span>
                                <div>{formatTimestamp(selectedJobDetail.finishedAt)}</div>
                            </div>
                        </div>

                        {selectedJobDetail.createUsersRequest && (
                            <div className="admin-detail-section">
                                <h3>Planned config</h3>
                                <p className="feed-muted">
                                    Create {selectedJobDetail.createUsersRequest.count} users with username prefix{' '}
                                    <strong>{selectedJobDetail.createUsersRequest.usernamePrefix}</strong> and phone prefix{' '}
                                    <strong>{selectedJobDetail.createUsersRequest.phonePrefix}</strong>.
                                </p>
                            </div>
                        )}

                        {selectedJobDetail.createdUsers?.length > 0 && (
                            <div className="admin-detail-section">
                                <h3>Created users</h3>
                                <div className="admin-detail-users">
                                    {selectedJobDetail.createdUsers.map((createdUser) => (
                                        <div className="admin-detail-user" key={createdUser.userId}>
                                            <strong>{createdUser.username}</strong>
                                            <span>{createdUser.phoneNumber}</span>
                                            <span>{createdUser.role}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedJobDetail.resultSummary && (
                            <div className="admin-detail-section">
                                <h3>Summary</h3>
                                <p className="admin-detail-summary">{selectedJobDetail.resultSummary}</p>
                            </div>
                        )}

                        {selectedJobDetail.errorMessage && (
                            <div className="admin-detail-section">
                                <h3>Error</h3>
                                <p className="admin-detail-error">{selectedJobDetail.errorMessage}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="feed-muted">No job selected.</p>
                )}
            </Modal>
        </div>
    );
};

export default Admin;
