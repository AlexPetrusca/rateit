import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClickOutside } from '../hooks/ClickOutside.jsx';
import UserAvatar from './UserAvatar.jsx';
import '../App.css';

const TopBar = () => {
    const { user, isAuthenticated, logout, checkAuthStatus } = useAuth();
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNavMenu, setShowNavMenu] = useState(false);
    const profileMenuRef = useRef(null);
    const navMenuRef = useRef(null);

    const isFullyAuthenticated = isAuthenticated && user != null;
    const isAdmin = user?.role === 'ROLE_ADMIN';

    useClickOutside(profileMenuRef, () => setShowProfileMenu(false));
    useClickOutside(navMenuRef, () => setShowNavMenu(false));

    const navigateAndCloseNavMenu = (path) => {
        navigate(path);
        setShowNavMenu(false);
    };

    const handleProfileClick = async () => {
        const currentUserId = user?.userId ?? user?.id;

        if (currentUserId != null) {
            navigate(`/users/${currentUserId}`);
            setShowProfileMenu(false);
            return;
        }

        const refreshedUser = await checkAuthStatus();
        const refreshedUserId = refreshedUser?.userId ?? refreshedUser?.id;

        if (refreshedUserId != null) {
            navigate(`/users/${refreshedUserId}`);
        } else {
            navigate('/create-account');
        }

        setShowProfileMenu(false);
    };

    const handleLogoutClick = () => {
        logout();
        setShowProfileMenu(false);
    };

    const handleEditProfileClick = () => {
        navigate('/profile/edit');
        setShowProfileMenu(false);
    };

    return (
        <div className="top-bar">
            <div className="top-bar-left">
                <div className="menu-container" ref={navMenuRef}>
                    <button
                        type="button"
                        className="hamburger-button"
                        aria-haspopup="menu"
                        aria-expanded={showNavMenu}
                        aria-label="Open navigation menu"
                        onClick={() => setShowNavMenu((current) => !current)}
                    >
                        <span className="hamburger-icon" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </span>
                    </button>
                    {showNavMenu && (
                        <div className="dropdown-menu nav-dropdown-menu" role="menu">
                            <button onClick={() => navigateAndCloseNavMenu('/')}>Home</button>
                            <button onClick={() => navigateAndCloseNavMenu('/backlog')}>Backlog</button>
                            <button onClick={() => navigateAndCloseNavMenu('/install')}>Install</button>
                            {!isFullyAuthenticated && <button onClick={() => navigateAndCloseNavMenu('/login')}>Login</button>}
                            {isAdmin && <button onClick={() => navigateAndCloseNavMenu('/admin/posts')}>Admin</button>}
                        </div>
                    )}
                </div>
            </div>
            <div className="top-bar-right">
                {isFullyAuthenticated ? (
                    <>
                        <button className="create-button" onClick={() => navigate('/create')}>
                            <span aria-hidden="true">+</span>
                            <span className="nav-label-desktop">Create</span>
                            <span className="nav-label-mobile">Create</span>
                        </button>
                        <div className="user-menu-container" ref={profileMenuRef}>
                            <button
                                type="button"
                                className="profile-icon-button"
                                aria-haspopup="menu"
                                aria-expanded={showProfileMenu}
                                aria-label="Open profile menu"
                                onClick={() => setShowProfileMenu((current) => !current)}
                            >
                                <UserAvatar
                                    username={user?.username}
                                    profilePicUrl={user?.profilePicUrl}
                                    alt="Profile"
                                    size="md"
                                />
                            </button>
                            {showProfileMenu && (
                                <div className="dropdown-menu" role="menu">
                                    <button onClick={handleProfileClick}>Profile</button>
                                    <button onClick={handleEditProfileClick}>Edit Profile</button>
                                    <button onClick={handleLogoutClick}>Logout</button>
                                </div>
                            )}
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default TopBar;
