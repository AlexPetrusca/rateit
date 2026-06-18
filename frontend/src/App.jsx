import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Create from './pages/Create';
import Admin from './pages/Admin';
import AdminJobs from './pages/AdminJobs';
import AdminPosts from './pages/AdminPosts';
import AdminComments from './pages/AdminComments';
import AdminUsers from './pages/AdminUsers';
import AdminSuggestions from './pages/AdminSuggestions';
import Profile from './pages/Profile';
import ProfileEditor from './pages/ProfileEditor';
import PostEditor from './pages/PostEditor';
import Backlog from './pages/Backlog';
import InstallIphone from './pages/InstallIphone';
import Topic from './pages/Topic';
import SuggestionSubmit from './pages/SuggestionSubmit';
import PostRedirect from './pages/PostRedirect';
import SearchUsers from './pages/SearchUsers';
import FollowingFeed from './pages/FollowingFeed';
import FollowList from './pages/FollowList';
import Drafts from './pages/Drafts';
import GuardedRoute from './components/GuardedRoute.jsx';
import UnguardedRoute from "./components/UnguardedRoute.jsx";
import Layout from './components/Layout.jsx';
import { useAuth } from './contexts/AuthContext';
import { IconPackProvider } from './contexts/IconPackContext.jsx';
import './App.css';

const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
    return null;
};

const OwnProfileRedirect = () => {
    const { user } = useAuth();
    const currentUserId = user?.userId ?? user?.id;

    if (currentUserId == null) {
        return <Navigate to="/login" replace />;
    }

    return <Navigate to={`/users/${currentUserId}`} replace />;
};

function App() {
    return (
        <AuthProvider>
            <IconPackProvider>
            <NotificationProvider>
                <Router>
                    <ScrollToTop />
                    <Layout>
                        <Routes>
                            <Route path="/login" element={
                                <UnguardedRoute>
                                    <Login />
                                </UnguardedRoute>
                            } />

                            <Route
                                path="/create"
                                element={
                                    <GuardedRoute>
                                        <Create />
                                    </GuardedRoute>
                                }
                            />

                            <Route
                                path="/drafts"
                                element={
                                    <GuardedRoute>
                                        <Drafts />
                                    </GuardedRoute>
                                }
                            />

                            <Route path="/create-account" element={<Navigate to="/login" replace />} />

                            <Route
                                path="/profile"
                                element={
                                    <GuardedRoute>
                                        <OwnProfileRedirect />
                                    </GuardedRoute>
                                }
                            />
                            <Route
                                path="/profile/edit"
                                element={
                                    <GuardedRoute>
                                        <ProfileEditor />
                                    </GuardedRoute>
                                }
                            />
                            <Route
                                path="/users/:userId"
                                element={
                                    <GuardedRoute>
                                        <Profile />
                                    </GuardedRoute>
                                }
                            />
                            <Route
                                path="/posts/:ratingId"
                                element={
                                    <GuardedRoute>
                                        <PostRedirect />
                                    </GuardedRoute>
                                }
                            />
                            <Route
                                path="/topics/:rateableItemId"
                                element={
                                    <GuardedRoute>
                                        <Topic />
                                    </GuardedRoute>
                                }
                            />
                            <Route
                                path="/posts/:ratingId/edit"
                                element={
                                    <GuardedRoute>
                                        <PostEditor />
                                    </GuardedRoute>
                                }
                            />
                            <Route
                                path="/search"
                                element={
                                    <GuardedRoute>
                                        <SearchUsers />
                                    </GuardedRoute>
                                }
                            />
                            <Route
                                path="/backlog"
                                element={
                                    <GuardedRoute>
                                        <Backlog />
                                    </GuardedRoute>
                                }
                            />
                            <Route
                                path="/backlog/suggest"
                                element={
                                    <GuardedRoute>
                                        <SuggestionSubmit />
                                    </GuardedRoute>
                                }
                            />
                            <Route path="/install" element={<InstallIphone />} />
                            <Route
                                path="/users/:userId/followers"
                                element={
                                    <GuardedRoute>
                                        <FollowList type="followers" />
                                    </GuardedRoute>
                                }
                            />
                            <Route
                                path="/users/:userId/following"
                                element={
                                    <GuardedRoute>
                                        <FollowList type="following" />
                                    </GuardedRoute>
                                }
                            />

                            <Route
                                element={
                                    <GuardedRoute requiredRole="ROLE_ADMIN" />
                                }
                            >
                                <Route
                                    path="/admin"
                                    element={<Admin />}
                                >
                                    <Route index element={<Navigate to="users" replace />} />
                                    <Route path="posts" element={<AdminPosts />} />
                                    <Route path="comments" element={<AdminComments />} />
                                    <Route path="suggestions" element={<AdminSuggestions />} />
                                    <Route path="users" element={<AdminUsers />} />
                                    <Route path="jobs" element={<AdminJobs />} />
                                </Route>
                            </Route>

                            <Route path="/following" element={
                                <GuardedRoute>
                                    <FollowingFeed />
                                </GuardedRoute>
                            } />

                            <Route path="/" element={
                                <GuardedRoute>
                                    <Home />
                                </GuardedRoute>
                            } />
                        </Routes>
                    </Layout>
                </Router>
            </NotificationProvider>
            </IconPackProvider>
        </AuthProvider>
    );
}

export default App;
