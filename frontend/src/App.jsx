import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Home from './pages/Home';
import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import Create from './pages/Create';
import Admin from './pages/Admin';
import AdminJobs from './pages/AdminJobs';
import AdminPosts from './pages/AdminPosts';
import AdminComments from './pages/AdminComments';
import AdminUsers from './pages/AdminUsers';
import Profile from './pages/Profile';
import ProfileEditor from './pages/ProfileEditor';
import PostEditor from './pages/PostEditor';
import Post from './pages/Post';
import SearchUsers from './pages/SearchUsers';
import FollowList from './pages/FollowList';
import GuardedRoute from './components/GuardedRoute.jsx';
import UnguardedRoute from "./components/UnguardedRoute.jsx";
import Layout from './components/Layout.jsx';
import { useAuth } from './contexts/AuthContext';
import './App.css';

const OwnProfileRedirect = () => {
    const { user } = useAuth();
    const currentUserId = user?.userId ?? user?.id;

    if (currentUserId == null) {
        return <Navigate to="/create-account" replace />;
    }

    return <Navigate to={`/users/${currentUserId}`} replace />;
};

function App() {
    return (
        <AuthProvider>
            <NotificationProvider>
                <Router>
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
                                path="/create-account"
                                element={
                                    <GuardedRoute requireUser={false}>
                                        <CreateAccount />
                                    </GuardedRoute>
                                }
                            />

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
                                        <Post />
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
                                    <Route path="users" element={<AdminUsers />} />
                                    <Route path="jobs" element={<AdminJobs />} />
                                </Route>
                            </Route>

                            <Route path="/" element={
                                <Home />
                            } />
                        </Routes>
                    </Layout>
                </Router>
            </NotificationProvider>
        </AuthProvider>
    );
}

export default App;
