import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';

const AccountSetupForm = ({ className = '', onSuccess }) => {
    const [username, setUsername] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);
    const { updateUser } = useAuth();
    const { notify } = useNotifications();
    const navigate = useNavigate();

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return undefined;
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile]);

    const handlePickFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event) => {
        setSelectedFile(event.target.files?.[0] || null);
    };

    const handleSubmit = async () => {
        const trimmedUsername = username.trim();

        if (!trimmedUsername) {
            notify({ message: 'Please enter a username', type: 'warning' });
            return;
        }

        setIsLoading(true);

        try {
            let profilePicUrl = null;

            if (selectedFile) {
                const { uploadUrl, key } = await BackendApiService.getUploadUrl(selectedFile.name, selectedFile.type);
                await BackendApiService.uploadFileToS3(uploadUrl, selectedFile);
                profilePicUrl = key;
            }

            const updatedUser = await BackendApiService.createOrUpdateUser({
                username: trimmedUsername,
                profilePicUrl
            });

            updateUser(updatedUser);

            if (onSuccess) {
                onSuccess(updatedUser);
            } else {
                navigate('/');
            }
        } catch (err) {
            const message = err.message || 'Error saving profile';
            notify({ message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`account-setup-form ${className}`.trim()}>
            <div className="form-group">
                <label htmlFor="account-setup-username">Username</label>
                <input
                    id="account-setup-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Choose a username"
                />
            </div>

            <div className="form-group account-setup-upload-group">
                <label>Profile picture</label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="account-setup-file-input"
                />
                <button
                    type="button"
                    className="account-setup-upload-button"
                    onClick={handlePickFile}
                >
                    {selectedFile ? 'Change photo' : 'Upload photo'}
                </button>
                {selectedFile && (
                    <div className="account-setup-file-name" title={selectedFile.name}>
                        {selectedFile.name}
                    </div>
                )}
                {previewUrl && (
                    <img
                        className="account-setup-preview"
                        src={previewUrl}
                        alt="Selected profile picture preview"
                    />
                )}
            </div>

            <div className="composer-actions account-setup-actions">
                <button type="button" onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Continue'}
                </button>
            </div>
        </div>
    );
};

export default AccountSetupForm;
