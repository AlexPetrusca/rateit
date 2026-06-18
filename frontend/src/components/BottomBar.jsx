import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import HomeIconHD from '../assets/icons/hand_drawn/home.svg?react';
import FollowingIconHD from '../assets/icons/hand_drawn/following.svg?react';
import CreateIconHD from '../assets/icons/hand_drawn/create.svg?react';
import SearchIconHD from '../assets/icons/hand_drawn/search.svg?react';
import ProfileIconHD from '../assets/icons/hand_drawn/profile.svg?react';
import { useAuth } from '../contexts/AuthContext';
import { useIconPack } from '../contexts/IconPackContext.jsx';

const TABS_DEFAULT = (profilePath) => [
    { icon: <HomeRoundedIcon />, path: '/', label: 'Home', exact: true },
    { icon: <PeopleOutlinedIcon />, path: '/following', label: 'Following' },
    { icon: <AddIcon sx={{ fontSize: 30 }} />, path: '/create', label: 'Create' },
    { icon: <SearchIcon />, path: '/search', label: 'Search' },
    { icon: <AccountCircleOutlinedIcon />, path: profilePath, label: 'Profile', match: '/users' },
];

const TABS_HAND_DRAWN = (profilePath) => [
    { icon: <HomeIconHD />, path: '/', label: 'Home', exact: true },
    { icon: <FollowingIconHD />, path: '/following', label: 'Following' },
    { icon: <CreateIconHD />, path: '/create', label: 'Create' },
    { icon: <SearchIconHD />, path: '/search', label: 'Search' },
    { icon: <ProfileIconHD />, path: profilePath, label: 'Profile', match: '/users' },
];

const BottomBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { iconPack } = useIconPack();
    const [hidden, setHidden] = useState(false);
    const lastY = useRef(0);

    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            setHidden(y > lastY.current && y > 40);
            lastY.current = y;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const profilePath = user?.userId ? `/users/${user.userId}` : user?.id ? `/users/${user.id}` : '/profile';
    const tabs = iconPack === 'hand_drawn' ? TABS_HAND_DRAWN(profilePath) : TABS_DEFAULT(profilePath);

    const isActive = ({ path, exact, match }) => {
        if (exact) return location.pathname === path;
        if (match) return location.pathname.startsWith(match);
        return location.pathname.startsWith(path);
    };

    return (
        <nav className={`bottom-bar${hidden ? ' bottom-bar--hidden' : ''}`} aria-label="Main navigation">
            {tabs.map((tab) => (
                <button
                    key={tab.label}
                    type="button"
                    className={`bottom-bar-btn${isActive(tab) ? ' active' : ''}`}
                    aria-label={tab.label}
                    onClick={() => navigate(tab.path)}
                >
                    {tab.icon}
                </button>
            ))}
        </nav>
    );
};

export default BottomBar;
