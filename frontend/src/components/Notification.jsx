const Notification = ({ notification, onDismiss }) => {
    return (
        <div
            className={`notification notification-${notification.type}`}
            role={notification.type === 'error' ? 'alert' : 'status'}
        >
            <div className="notification-message">{notification.message}</div>
            <button
                type="button"
                className="notification-close"
                onClick={() => onDismiss(notification.id)}
                aria-label="Dismiss notification"
            >
                ×
            </button>
        </div>
    );
};

export default Notification;
