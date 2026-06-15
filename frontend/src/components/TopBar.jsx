import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {useClickOutside} from "../hooks/ClickOutside.jsx";
import UserAvatar from './UserAvatar.jsx';
import '../App.css';

const TopBar = () => {
    const { user, isAuthenticated, logout, checkAuthStatus } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    const isFullyAuthenticated = isAuthenticated && user != null;
    const isAdmin = user?.role === 'ROLE_ADMIN';
    const isOnAdminPage = location.pathname.startsWith('/admin');
    const isOnSearchPage = location.pathname.startsWith('/search');
    const isOnBacklogPage = location.pathname.startsWith('/backlog');

    useClickOutside(menuRef, () => setShowMenu(false));

    const handleProfileClick = async () => {
        const currentUserId = user?.userId ?? user?.id;

        if (currentUserId != null) {
            navigate(`/users/${currentUserId}`);
            setShowMenu(false);
            return;
        }

        const refreshedUser = await checkAuthStatus();
        const refreshedUserId = refreshedUser?.userId ?? refreshedUser?.id;

        if (refreshedUserId != null) {
            navigate(`/users/${refreshedUserId}`);
        } else {
            navigate('/create-account');
        }

        setShowMenu(false);
    };

    const handleLogoutClick = () => {
        logout();
        setShowMenu(false);
    };

    const handleEditProfileClick = () => {
        navigate('/profile/edit');
        setShowMenu(false);
    };

    return (
        <div className="top-bar">
            <div className="top-bar-left">
                <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <div className="logo-icon">C</div>
                    <span className="company-name">Critic</span>
                </div>
            </div>
            <div className="top-bar-right">
                {isFullyAuthenticated ? (
                    <>
                        {isAdmin && (
                            <button
                                className={isOnAdminPage ? 'admin-button is-active' : 'admin-button'}
                                aria-current={isOnAdminPage ? 'page' : undefined}
                                onClick={() => navigate('/admin/posts')}
                            >
                                Admin
                            </button>
                        )}
                        <button className="create-button" onClick={() => navigate('/create')}>
                            <span aria-hidden="true">+</span>
                            <span className="nav-label-desktop">Create</span>
                            <span className="nav-label-mobile">Create</span>
                        </button>
                        <button
                            className={isOnSearchPage ? 'nav-pill-button is-active' : 'nav-pill-button'}
                            aria-current={isOnSearchPage ? 'page' : undefined}
                            aria-label="Find people"
                            onClick={() => navigate('/search')}
                        >
                            <span className="nav-label-desktop">Find People</span>
                            <span className="nav-label-mobile">Find</span>
                        </button>
                        <button
                            className={isOnBacklogPage ? 'nav-pill-button is-active' : 'nav-pill-button'}
                            aria-current={isOnBacklogPage ? 'page' : undefined}
                            aria-label="Open backlog"
                            onClick={() => navigate('/backlog')}
                        >
                            <span className="nav-label-desktop">Backlog</span>
                            <span className="nav-label-mobile">Backlog</span>
                        </button>
                        <div className="user-menu-container" ref={menuRef}>
                            <button
                                type="button"
                                className="profile-icon-button"
                                aria-haspopup="menu"
                                aria-expanded={showMenu}
                                aria-label="Open profile menu"
                                onClick={() => setShowMenu((current) => !current)}
                            >
                                <UserAvatar
                                    username={user?.username}
                                    profilePicUrl={user?.profilePicUrl}
                                    alt="Profile"
                                    size="md"
                                />
                            </button>
                            {showMenu && (
                                <div className="dropdown-menu" role="menu">
                                    <button onClick={handleProfileClick}>Profile</button>
                                    <button onClick={handleEditProfileClick}>Edit Profile</button>
                                    <button onClick={handleLogoutClick}>Logout</button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <button className="login-button" onClick={() => navigate('/login')}>
                        Login
                    </button>
                )}
            </div>
        </div>
    );
};

export default TopBar;
