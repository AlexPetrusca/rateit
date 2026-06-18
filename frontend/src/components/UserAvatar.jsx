import { useState } from 'react';

const SIZE_TO_PX = {
    sm: 28,
    md: 40,
    lg: 48,
    xl: 150
};

const UserAvatar = ({
    username,
    profilePicUrl,
    alt = '',
    size = 'md',
    fallbackText,
    className = ''
}) => {
    const [imageFailed, setImageFailed] = useState(false);
    const sizeValue = typeof size === 'number' ? size : (SIZE_TO_PX[size] || SIZE_TO_PX.md);
    const fallback = fallbackText || (username && username !== '[deleted]' ? username.charAt(0).toUpperCase() : '?');
    const classes = ['user-avatar', `user-avatar-${typeof size === 'string' ? size : 'custom'}`, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes} style={{ '--avatar-size': `${sizeValue}px` }}>
            {profilePicUrl && !imageFailed ? (
                <img
                    src={/^(blob:|https?:)/.test(profilePicUrl) ? profilePicUrl : `/api/s3/images/${profilePicUrl}`}
                    alt={alt}
                    className="user-avatar-image"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <div className="user-avatar-placeholder">
                    {fallback}
                </div>
            )}
        </div>
    );
};

export default UserAvatar;
