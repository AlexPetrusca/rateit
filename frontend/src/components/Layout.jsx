import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';

const PULL_THRESHOLD = 72;
const MAX_PULL_DISTANCE = 140;
const EDGE_THRESHOLD = 8;

const Layout = ({ children }) => {
    const location = useLocation();
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const gestureRef = useRef({
        active: false,
        startY: 0,
        distance: 0
    });

    useEffect(() => {
        if (location.pathname === '/login') {
            return undefined;
        }

        const resetGesture = () => {
            gestureRef.current = {
                active: false,
                startY: 0,
                distance: 0
            };
            setPullDistance(0);
        };

        const startRefresh = () => {
            setIsRefreshing(true);
            setPullDistance(PULL_THRESHOLD);
            window.setTimeout(() => window.location.reload(), 120);
        };

        const handleTouchStart = (event) => {
            if (isRefreshing || window.scrollY > EDGE_THRESHOLD) {
                return;
            }

            const target = event.target;
            if (target instanceof Element && target.closest('input, textarea, select, button, a, [role="button"]')) {
                return;
            }

            const touch = event.touches[0];
            if (!touch) {
                return;
            }

            gestureRef.current = {
                active: true,
                startY: touch.clientY,
                distance: 0
            };
        };

        const handleTouchMove = (event) => {
            if (!gestureRef.current.active || isRefreshing) {
                return;
            }

            const touch = event.touches[0];
            if (!touch) {
                return;
            }

            const nextDistance = Math.min(Math.max(touch.clientY - gestureRef.current.startY, 0), MAX_PULL_DISTANCE);

            if (nextDistance <= 0) {
                setPullDistance(0);
                gestureRef.current.distance = 0;
                return;
            }

            event.preventDefault();
            gestureRef.current.distance = nextDistance;
            setPullDistance(nextDistance);
        };

        const handleTouchEnd = () => {
            if (gestureRef.current.distance >= PULL_THRESHOLD) {
                startRefresh();
            } else {
                resetGesture();
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [isRefreshing, location.pathname]);

    const refreshProgress = Math.min(1, pullDistance / PULL_THRESHOLD);
    const refreshMessage = isRefreshing
        ? 'Refreshing...'
        : pullDistance >= PULL_THRESHOLD
            ? 'Release to refresh'
            : 'Pull down to refresh';
    const isLoginPage = location.pathname === '/login';

    return (
        <>
            {!isLoginPage && (
                <>
                    <div
                        className={`refresh-banner ${pullDistance > 0 || isRefreshing ? 'is-visible' : ''}`}
                        style={{ '--refresh-progress': refreshProgress }}
                        aria-hidden="true"
                    >
                        <span className="refresh-banner-icon" />
                        <span className="refresh-banner-text">{refreshMessage}</span>
                    </div>
                    <TopBar />
                </>
            )}
            <main className={isLoginPage ? 'page-content page-content-login' : 'page-content'}>
                {children}
            </main>
        </>
    );
};

export default Layout;
