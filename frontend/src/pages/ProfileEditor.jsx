import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';

const OUTPUT_SIZE = 512;
const PREVIEW_SIZE = 260;

const getCropGeometry = ({ imageWidth, imageHeight, zoom, cropX, cropY, outputSize }) => {
    const baseScale = Math.max(outputSize / imageWidth, outputSize / imageHeight);
    const scale = baseScale * zoom;
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    const maxOffsetX = Math.max(0, (drawWidth - outputSize) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - outputSize) / 2);

    return {
        drawWidth,
        drawHeight,
        drawX: (outputSize - drawWidth) / 2 + (cropX / 100) * maxOffsetX,
        drawY: (outputSize - drawHeight) / 2 + (cropY / 100) * maxOffsetY
    };
};

const loadImage = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
});

const createCroppedProfileImage = async ({ imageUrl, imageSize, zoom, cropX, cropY }) => {
    const image = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    const geometry = getCropGeometry({
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
        zoom,
        cropX,
        cropY,
        outputSize: OUTPUT_SIZE
    });

    context.drawImage(image, geometry.drawX, geometry.drawY, geometry.drawWidth, geometry.drawHeight);

    const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });

    if (!blob) {
        throw new Error('Failed to crop profile picture');
    }

    return new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });
};

const ProfileEditor = () => {
    const { user, updateUser } = useAuth();
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [imageSize, setImageSize] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [cropX, setCropX] = useState(0);
    const [cropY, setCropY] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const currentProfilePicUrl = user?.profilePicUrl || '';
    const username = user?.username || '';
    const currentUserId = user?.userId ?? user?.id;

    const displayedProfilePicUrl = useMemo(() => {
        if (previewUrl) {
            return previewUrl;
        }

        return currentProfilePicUrl;
    }, [currentProfilePicUrl, previewUrl]);

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            setImageSize(null);
            return undefined;
        }

        const nextPreviewUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(nextPreviewUrl);
        setImageSize(null);
        setZoom(1);
        setCropX(0);
        setCropY(0);

        return () => URL.revokeObjectURL(nextPreviewUrl);
    }, [selectedFile]);

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0] || null;
        if (file && !file.type.startsWith('image/')) {
            notify({ message: 'Please choose an image file.', type: 'warning' });
            event.target.value = '';
            return;
        }

        setSelectedFile(file);
    };

    const cropPreviewStyle = useMemo(() => {
        if (!imageSize) {
            return {};
        }

        const geometry = getCropGeometry({
            imageWidth: imageSize.width,
            imageHeight: imageSize.height,
            zoom,
            cropX,
            cropY,
            outputSize: PREVIEW_SIZE
        });

        return {
            width: `${geometry.drawWidth}px`,
            height: `${geometry.drawHeight}px`,
            transform: `translate(${geometry.drawX}px, ${geometry.drawY}px)`
        };
    }, [cropX, cropY, imageSize, zoom]);

    const handleSave = async () => {
        if (!username) {
            notify({ message: 'Your username could not be loaded. Refresh and try again.', type: 'error' });
            return;
        }

        if (!selectedFile) {
            notify({ message: 'Choose a new profile picture first.', type: 'warning' });
            return;
        }

        setIsSaving(true);

        try {
            const uploadFile = await createCroppedProfileImage({
                imageUrl: previewUrl,
                imageSize,
                zoom,
                cropX,
                cropY
            });
            const { uploadUrl, key } = await BackendApiService.getUploadUrl(uploadFile.name, uploadFile.type);
            await BackendApiService.uploadFileToS3(uploadUrl, uploadFile);
            const updatedUser = await BackendApiService.updateCurrentUser({
                username,
                profilePicUrl: key
            });

            updateUser(updatedUser);
            notify({ message: 'Profile picture updated.', type: 'info' });
            navigate(currentUserId != null ? `/users/${currentUserId}` : '/profile');
        } catch (error) {
            notify({ message: error.message || 'Failed to update profile picture', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className="profile-editor-shell">
            <section className="profile-editor-panel">
                <header className="profile-editor-header">
                    <div>
                        <h1>Edit Profile</h1>
                        <p>Update the photo people see next to your ratings and comments.</p>
                    </div>
                </header>

                <div className="profile-editor-preview">
                    {previewUrl ? (
                        <div className="profile-editor-cropper">
                            <div className="profile-editor-crop-frame">
                                <img
                                    src={displayedProfilePicUrl}
                                    alt="New profile preview"
                                    className="profile-editor-crop-image"
                                    style={cropPreviewStyle}
                                    onLoad={(event) => setImageSize({
                                        width: event.currentTarget.naturalWidth,
                                        height: event.currentTarget.naturalHeight
                                    })}
                                />
                            </div>
                        </div>
                    ) : (
                        <UserAvatar
                            username={username}
                            profilePicUrl={displayedProfilePicUrl}
                            alt="Current profile"
                            size="xl"
                        />
                    )}
                </div>

                {previewUrl && (
                    <div className="profile-editor-adjustments">
                        <div className="profile-editor-slider">
                            <label htmlFor="profile-picture-zoom">Size</label>
                            <input
                                id="profile-picture-zoom"
                                type="range"
                                min="1"
                                max="3"
                                step="0.01"
                                value={zoom}
                                onChange={(event) => setZoom(Number(event.target.value))}
                            />
                        </div>
                        <div className="profile-editor-slider">
                            <label htmlFor="profile-picture-horizontal">Horizontal Position</label>
                            <input
                                id="profile-picture-horizontal"
                                type="range"
                                min="-100"
                                max="100"
                                step="1"
                                value={cropX}
                                onChange={(event) => setCropX(Number(event.target.value))}
                            />
                        </div>
                        <div className="profile-editor-slider">
                            <label htmlFor="profile-picture-vertical">Vertical Position</label>
                            <input
                                id="profile-picture-vertical"
                                type="range"
                                min="-100"
                                max="100"
                                step="1"
                                value={cropY}
                                onChange={(event) => setCropY(Number(event.target.value))}
                            />
                        </div>
                    </div>
                )}

                <div className="profile-editor-controls">
                    <label htmlFor="profile-picture-upload">Profile Picture</label>
                    <input
                        id="profile-picture-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                    />
                </div>

                <div className="profile-editor-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => navigate(currentUserId != null ? `/users/${currentUserId}` : '/profile')}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !selectedFile || !imageSize}
                    >
                        {isSaving ? 'Saving...' : 'Save Photo'}
                    </button>
                </div>
            </section>
        </main>
    );
};

export default ProfileEditor;
