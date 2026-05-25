import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Home from './pages/Home';
import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import Create from './pages/Create';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
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
                                path="/admin"
                                element={
                                    <GuardedRoute requiredRole="ROLE_ADMIN">
                                        <Admin />
                                    </GuardedRoute>
                                }
                            />

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
