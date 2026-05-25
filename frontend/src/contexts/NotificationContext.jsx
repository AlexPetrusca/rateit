import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Notification from '../components/Notification.jsx';

const NotificationContext = createContext(null);
const DEFAULT_DURATION_MS = 4000;

let nextNotificationId = 1;

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const timersRef = useRef(new Map());

    const dismiss = useCallback((id) => {
        const timerId = timersRef.current.get(id);
        if (timerId != null) {
            clearTimeout(timerId);
            timersRef.current.delete(id);
        }
        setNotifications((current) => current.filter((notification) => notification.id !== id));
    }, []);

    const notify = useCallback(({ message, type = 'info', persistent = false, duration = DEFAULT_DURATION_MS }) => {
        const id = nextNotificationId++;
        const notification = { id, message, type, persistent };

        setNotifications((current) => [...current, notification]);

        if (!persistent) {
            const timerId = window.setTimeout(() => {
                timersRef.current.delete(id);
                dismiss(id);
            }, duration);
            timersRef.current.set(id, timerId);
        }

        return id;
    }, [dismiss]);

    useEffect(() => {
        return () => {
            timersRef.current.forEach((timerId) => clearTimeout(timerId));
            timersRef.current.clear();
            setNotifications([]);
        };
    }, []);

    const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

    return (
            <NotificationContext.Provider value={value}>
                {children}
                <div className="notification-stack" aria-live="polite" aria-relevant="additions removals">
                    {notifications.map((notification) => (
                        <Notification key={notification.id} notification={notification} onDismiss={dismiss} />
                    ))}
                </div>
            </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
