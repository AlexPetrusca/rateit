import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {useClickOutside} from "../hooks/ClickOutside.jsx";
import UserAvatar from './UserAvatar.jsx';
import '../App.css';

const TopBar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    const isFullyAuthenticated = isAuthenticated && user != null;
    const isAdmin = user?.role === 'ROLE_ADMIN';

    useClickOutside(menuRef, () => setShowMenu(false));

    const handleProfileClick = () => {
        navigate('/profile');
        setShowMenu(false);
    };

    const handleLogoutClick = () => {
        logout();
        setShowMenu(false);
    };

    return (
        <div className="top-bar">
            <div className="top-bar-left">
                <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <div className="logo-icon">RI</div>
                    <span className="company-name">RateIt</span>
                </div>
            </div>
            <div className="top-bar-right">
                {isFullyAuthenticated ? (
                    <>
                        {isAdmin && (
                            <button className="admin-button" onClick={() => navigate('/admin')}>
                                Admin
                            </button>
                        )}
                        <button className="create-button" onClick={() => navigate('/create')}>
                            + Create
                        </button>
                        <div className="user-menu-container" ref={menuRef}>
                            <button
                                type="button"
                                className="profile-icon-button"
                                onClick={() => setShowMenu(!showMenu)}
                            >
                                <UserAvatar
                                    username={user?.username}
                                    profilePicUrl={user?.profilePicUrl}
                                    alt="Profile"
                                    size="md"
                                />
                            </button>
                            {showMenu && (
                                <div className="dropdown-menu">
                                    <button onClick={handleProfileClick}>Profile</button>
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
