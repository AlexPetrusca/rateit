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
import Post from './pages/Post';
import GuardedRoute from './components/GuardedRoute.jsx';
import UnguardedRoute from "./components/UnguardedRoute.jsx";
import Layout from './components/Layout.jsx';
import './App.css';

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
                                        <Profile />
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
