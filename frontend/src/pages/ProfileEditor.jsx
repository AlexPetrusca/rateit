import { useEffect, useRef, useState } from 'react';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import CropRotateIcon from '@mui/icons-material/CropRotate';
import CameraIconHD from '../assets/icons/hand_drawn/camera.svg?react';
import UploadIconHD from '../assets/icons/hand_drawn/upload.svg?react';
import ResizeIconHD from '../assets/icons/hand_drawn/resize.svg?react';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useIconPack } from '../contexts/IconPackContext.jsx';
import BackendApiService from '../services/BackendApiService';

const OUTPUT_SIZE = 512;
const CROP_SIZE = 300;

const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
});

const createCroppedProfileImage = async ({ imageUrl, naturalSize, zoom, offsetX, offsetY }) => {
    const image = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    const scale = Math.max(OUTPUT_SIZE / naturalSize.width, OUTPUT_SIZE / naturalSize.height);
    const imgW = naturalSize.width * scale * zoom;
    const imgH = naturalSize.height * scale * zoom;
    const offsetScale = OUTPUT_SIZE / CROP_SIZE;
    const drawX = OUTPUT_SIZE / 2 + offsetX * offsetScale - imgW / 2;
    const drawY = OUTPUT_SIZE / 2 + offsetY * offsetScale - imgH / 2;

    ctx.drawImage(image, drawX, drawY, imgW, imgH);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error('Failed to crop profile picture');
    return new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });
};

const CropModal = ({ previewUrl, onConfirm, onCancel }) => {
    const stageRef = useRef(null);
    const [naturalSize, setNaturalSize] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const pointers = useRef(new Map());
    const lastPinchDist = useRef(null);

    const getPinchDist = () => {
        const pts = [...pointers.current.values()];
        if (pts.length < 2) return null;
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handlePointerDown = (e) => {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        stageRef.current.setPointerCapture(e.pointerId);
        if (pointers.current.size === 2) {
            lastPinchDist.current = getPinchDist();
        }
    };

    const handlePointerMove = (e) => {
        const prev = pointers.current.get(e.pointerId);
        if (!prev) return;
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.current.size === 2) {
            const dist = getPinchDist();
            if (lastPinchDist.current && dist) {
                const scale = dist / lastPinchDist.current;
                setZoom(z => Math.max(0.5, Math.min(6, z * scale)));
            }
            lastPinchDist.current = dist;
        } else {
            setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
        }
    };

    const handlePointerUp = (e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) lastPinchDist.current = null;
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        setZoom(z => Math.max(0.5, Math.min(6, z * factor)));
    };

    const handleImgLoad = (e) => {
        setNaturalSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight });
    };

    const baseScale = naturalSize
        ? Math.max(CROP_SIZE / naturalSize.width, CROP_SIZE / naturalSize.height)
        : 1;

    const imgStyle = naturalSize ? {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: naturalSize.width * baseScale * zoom,
        height: naturalSize.height * baseScale * zoom,
        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
        maxWidth: 'none',
        pointerEvents: 'none',
        userSelect: 'none',
    } : { display: 'none' };

    return (
        <div className="crop-modal-overlay">
            <div className="crop-modal-inner">
                <div
                    className="crop-modal-stage"
                    ref={stageRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onWheel={handleWheel}
                >
                    <img src={previewUrl} onLoad={handleImgLoad} style={imgStyle} alt="" draggable="false" />
                </div>
                <div className="crop-modal-actions">
                    <button type="button" onClick={onCancel}>Cancel</button>
                    <button type="button" onClick={() => onConfirm({ zoom, offsetX: offset.x, offsetY: offset.y, naturalSize })}>
                        Use Photo
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProfileEditor = () => {
    const { user, updateUser } = useAuth();
    const { notify } = useNotifications();
    const { iconPack, setIconPack } = useIconPack();
    const hd = iconPack === 'hand_drawn';
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [croppedFile, setCroppedFile] = useState(null);
    const [croppedPreviewUrl, setCroppedPreviewUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const currentProfilePicUrl = user?.profilePicUrl || '';
    const username = user?.username || '';
    const currentUserId = user?.userId ?? user?.id;

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return undefined;
        }
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        setShowCropModal(true);
        return () => URL.revokeObjectURL(url);
    }, [selectedFile]);

    useEffect(() => {
        return () => { if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl); };
    }, [croppedPreviewUrl]);

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0] || null;
        event.target.value = '';
        if (file && !file.type.startsWith('image/')) {
            notify({ message: 'Please choose an image file.', type: 'warning' });
            return;
        }
        setSelectedFile(file);
    };

    const handleCropConfirm = async ({ zoom, offsetX, offsetY, naturalSize }) => {
        setShowCropModal(false);
        if (!naturalSize) return;
        const imageUrl = previewUrl || (currentProfilePicUrl ? `/api/s3/images/${currentProfilePicUrl}` : null);
        if (!imageUrl) return;
        try {
            const file = await createCroppedProfileImage({ imageUrl, naturalSize, zoom, offsetX, offsetY });
            setCroppedFile(file);
            const url = URL.createObjectURL(file);
            setCroppedPreviewUrl(url);
        } catch (err) {
            notify({ message: err.message || 'Failed to process image', type: 'error' });
            setSelectedFile(null);
        }
    };

    const handleCropCancel = () => {
        setShowCropModal(false);
        setSelectedFile(null);
    };

    const handleReCrop = () => {
        setShowCropModal(true);
    };

    const handleSave = async () => {
        if (!username) {
            notify({ message: 'Your username could not be loaded. Refresh and try again.', type: 'error' });
            return;
        }

        if (croppedFile) {
            setIsSaving(true);
            try {
                const { uploadUrl, key } = await BackendApiService.getUploadUrl(croppedFile.name, croppedFile.type);
                await BackendApiService.uploadFileToS3(uploadUrl, croppedFile);
                const updatedUser = await BackendApiService.updateCurrentUser({ username, profilePicUrl: key });
                updateUser(updatedUser);
                notify({ message: 'Profile updated.', type: 'info' });
            } catch (error) {
                notify({ message: error.message || 'Failed to update profile picture', type: 'error' });
                setIsSaving(false);
                return;
            }
            setIsSaving(false);
        }

        navigate(currentUserId != null ? `/users/${currentUserId}` : '/profile');
    };

    const avatarUrl = croppedPreviewUrl || currentProfilePicUrl;
    const cropSourceUrl = previewUrl || (currentProfilePicUrl ? `/api/s3/images/${currentProfilePicUrl}` : null);

    return (
        <main className="profile-editor-shell">
            {showCropModal && cropSourceUrl && (
                <CropModal
                    previewUrl={cropSourceUrl}
                    onConfirm={handleCropConfirm}
                    onCancel={handleCropCancel}
                />
            )}
            <section className="profile-editor-panel">
                <header className="profile-editor-header">
                    <div>
                        <h1>Edit Profile</h1>
                        <p>Update the photo people see next to your ratings and comments.</p>
                    </div>
                </header>

                <div className="profile-editor-preview">
                    <UserAvatar username={username} profilePicUrl={avatarUrl} alt="Profile preview" size="xl" />
                </div>

                <div className="profile-editor-controls">
                    <label>Profile Picture</label>
                    <div className="file-input-buttons">
                        <input id="profile-picture-upload" type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                        <input id="profile-picture-camera" type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: 'none' }} />
                        <button type="button" className="file-input-btn" aria-label="Take photo" onClick={() => document.getElementById('profile-picture-camera').click()}>
                            {hd ? <CameraIconHD /> : <PhotoCameraOutlinedIcon />}
                        </button>
                        <button type="button" className="file-input-btn" aria-label="Upload photo" onClick={() => document.getElementById('profile-picture-upload').click()}>
                            {hd ? <UploadIconHD /> : <FileUploadOutlinedIcon />}
                        </button>
                        {cropSourceUrl && (
                            <button type="button" className="file-input-btn" aria-label="Re-crop photo" onClick={handleReCrop}>
                                {hd ? <ResizeIconHD /> : <CropRotateIcon />}
                            </button>
                        )}
                    </div>
                </div>

                <div className="profile-editor-controls">
                    <label>Icon Pack</label>
                    <div className="icon-pack-options">
                        {[['hand_drawn', 'Hand Drawn'], ['default', 'Default']].map(([value, label]) => (
                            <label key={value} className="icon-pack-option">
                                <input
                                    type="radio"
                                    name="iconPack"
                                    value={value}
                                    checked={iconPack === value}
                                    onChange={() => setIconPack(value)}
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="profile-editor-actions">
                    <button
                        type="button"
                        onClick={() => navigate(currentUserId != null ? `/users/${currentUserId}` : '/profile')}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || (selectedFile && !croppedFile)}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
                <div className="profile-editor-nav-links">
                    <button type="button" onClick={() => navigate('/backlog')}>Backlog</button>
                    <button type="button" onClick={() => navigate('/install')}>Install</button>
                </div>
            </section>
        </main>
    );
};

export default ProfileEditor;
