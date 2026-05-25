import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/UserAvatar.jsx';
import '../App.css';

const Profile = () => {
    const { user } = useAuth();

    return (
        <div className="container">
            <h1>Your Profile</h1>
            <div className="profile-details">
                <UserAvatar
                    username={user?.username}
                    profilePicUrl={user?.profilePicUrl}
                    alt="Profile"
                    size="xl"
                    fallbackText="No Image"
                />
                <div className="detail-rows">
                    <div className="detail-row">
                        <strong>Username:</strong> {user?.username}
                    </div>
                    <div className="detail-row">
                        <strong>Phone:</strong> {user?.phoneNumber}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
