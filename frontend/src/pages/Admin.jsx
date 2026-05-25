import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const Admin = () => {
    const { user } = useAuth();
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        BackendApiService.getAdminStatus()
            .then((data) => {
                if (isMounted) {
                    setStatus(data);
                }
            })
            .catch((error) => {
                notify({ message: error.message || 'Failed to load admin status', type: 'error' });
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

    return (
        <div className="feed-page">
            <main className="twitter-shell">
                <div className="timeline-header">
                    <h1>Admin</h1>
                </div>

                <section className="admin-panel">
                    {isLoading ? (
                        <p className="feed-status">Loading admin data...</p>
                    ) : (
                        <>
                            <p className="feed-muted">
                                Current role: <strong>{user?.role || 'ROLE_USER'}</strong>
                            </p>
                            {status && (
                                <div className="admin-status-grid">
                                    <div>
                                        <span className="admin-label">Phone number</span>
                                        <div>{status.phoneNumber}</div>
                                    </div>
                                    <div>
                                        <span className="admin-label">Username</span>
                                        <div>{status.username}</div>
                                    </div>
                                    <div>
                                        <span className="admin-label">Role</span>
                                        <div>{status.role}</div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
};

export default Admin;
