import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const CreateAccount = () => {
    const [username, setUsername] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { updateUser } = useAuth();
    const { notify } = useNotifications();
    const navigate = useNavigate();

    const handleFileSelect = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleSubmit = async () => {
        if (!username) {
            notify({ message: 'Please enter a username', type: 'warning' });
            return;
        }
        setIsLoading(true);

        try {
            let profilePicUrl = null;

            // Upload image if selected
            if (selectedFile) {
                const { uploadUrl, key } = await BackendApiService.getUploadUrl(selectedFile.name, selectedFile.type);
                await BackendApiService.uploadFileToS3(uploadUrl, selectedFile);
                profilePicUrl = key;
            }

            // Create User
            const updatedUser = await BackendApiService.createOrUpdateUser({
                username,
                profilePicUrl
            });

            updateUser(updatedUser);
            navigate('/');
        } catch (err) {
            console.error(err);
            const message = err.message || 'Error creating account';
            notify({ message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container">
            <h1>Create Account</h1>
            <div className="form-group">
                <label>Username</label>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Profile Picture</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                />
            </div>
            <button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Account'}
            </button>
        </div>
    );
};

export default CreateAccount;
