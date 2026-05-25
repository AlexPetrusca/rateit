import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Container, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const Admin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { notify } = useNotifications();
    const [status, setStatus] = useState(null);

    useEffect(() => {
        let isMounted = true;

        BackendApiService.getAdminStatus()
            .then((adminStatus) => {
                if (isMounted) {
                    setStatus(adminStatus);
                }
            })
            .catch((error) => {
                notify({ message: error.message || 'Failed to load admin context', type: 'error' });
                if (error.status === 403) {
                    navigate('/');
                }
            });

        return () => {
            isMounted = false;
        };
    }, [navigate, notify]);

    const tabValue = useMemo(() => {
        if (location.pathname.startsWith('/admin/posts')) {
            return '/admin/posts';
        }

        if (location.pathname.startsWith('/admin/jobs')) {
            return '/admin/jobs';
        }

        return '/admin/users';
    }, [location.pathname]);

    return (
        <Box className="feed-page">
            <Container maxWidth="lg" sx={{ py: 3 }}>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                            Admin
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Environment tools, content moderation, and user management.
                        </Typography>
                    </Box>

                    <Paper elevation={1} sx={{ p: 2.5 }}>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="h6" component="h2" gutterBottom>
                                    Context
                                </Typography>
                                {status ? (
                                    <Stack spacing={0.5}>
                                        <Typography variant="body2" color="text.secondary">
                                            Current role: <strong>{status.role}</strong>
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Current account: <strong>{status.username}</strong> ({status.phoneNumber})
                                        </Typography>
                                    </Stack>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Loading admin context...
                                    </Typography>
                                )}
                            </Box>

                            <Tabs value={tabValue} variant="scrollable" scrollButtons="auto">
                                <Tab label="Posts" value="/admin/posts" component={NavLink} to="posts" />
                                <Tab label="Users" value="/admin/users" component={NavLink} to="users" />
                                <Tab label="Jobs" value="/admin/jobs" component={NavLink} to="jobs" />
                            </Tabs>
                        </Stack>
                    </Paper>

                    <Outlet />
                </Stack>
            </Container>
        </Box>
    );
};

export default Admin;
