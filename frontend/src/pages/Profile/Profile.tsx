import { useAuthContext } from '../../contexts/AuthContext';
import './Profile.css';

const ROLES_LIST: { [key: number]: string } = {
    2002: 'ADMIN',
    1992: 'USER'
};

function Profile() {
    const { auth } = useAuthContext();
    const user = auth.user;

    const getRoleNames = (roleNumbers: number[]): string[] => {
        return roleNumbers.map(role => ROLES_LIST[role] || `UNKNOWN(${role})`);
    };

    if (!user) {
        return (
            <div className="profile-container">
                <div className="profile-card">
                    <h1>Profile</h1>
                    <p className="error-message">Please log in to view your profile.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <h1>Profile</h1>
                <div className="profile-info">
                    <div className="info-item">
                        <span className="info-label">Username:</span>
                        <span className="info-value">{user.username}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Roles:</span>
                        <span className="info-value">{getRoleNames(user.roles).join(', ')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;