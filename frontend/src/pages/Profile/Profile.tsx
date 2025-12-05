import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { changePassword, deleteSelf } from '../../api/api';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import './Profile.css';

const ROLES_LIST: { [key: number]: string } = {
    2002: 'ADMIN',
    1992: 'USER'
};

function Profile() {
    const { auth, doLogout } = useAuthContext();
    const user = auth.user;
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();
    
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const getRoleNames = (roleNumbers: number[]): string[] => {
        return roleNumbers.map(role => ROLES_LIST[role] || `UNKNOWN(${role})`);
    };

    const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(null);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('All fields are required.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match.');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters long.');
            return;
        }

        try {
            setLoading(true);
            await changePassword(axiosPrivate, currentPassword, newPassword);
            setPasswordSuccess('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                setShowPasswordForm(false);
                setPasswordSuccess(null);
            }, 2000);
        } catch (err: any) {
            const errorMessage = err?.response?.data?.message || 'Failed to change password. Please try again.';
            setPasswordError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelPasswordChange = () => {
        setShowPasswordForm(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError(null);
        setPasswordSuccess(null);
    };

    const handleDeleteAccount = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setDeleteError(null);

        if (!deletePassword) {
            setDeleteError('Password is required.');
            return;
        }

        try {
            setDeleting(true);
            await deleteSelf(axiosPrivate, deletePassword);
            // Logout and redirect to home
            await doLogout();
            navigate('/');
        } catch (err: any) {
            const errorMessage = err?.response?.data?.message || 'Failed to delete account. Please try again.';
            setDeleteError(errorMessage);
        } finally {
            setDeleting(false);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
        setDeletePassword('');
        setDeleteError(null);
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
                
                <div className="password-section">
                    {!showPasswordForm ? (
                        <button
                            className="btn-change-password"
                            onClick={() => setShowPasswordForm(true)}
                        >
                            Change Password
                        </button>
                    ) : (
                        <form onSubmit={handlePasswordSubmit} className="password-form">
                            <h2>Change Password</h2>
                            
                            {passwordError && (
                                <div className="error-message">{passwordError}</div>
                            )}
                            
                            {passwordSuccess && (
                                <div className="success-message">{passwordSuccess}</div>
                            )}
                            
                            <div className="form-group">
                                <label htmlFor="currentPassword">Current Password</label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="newPassword">New Password</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                    minLength={8}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm New Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                    minLength={8}
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="btn-save"
                                    disabled={loading}
                                >
                                    {loading ? 'Changing...' : 'Change Password'}
                                </button>
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={handleCancelPasswordChange}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="delete-section">
                    {!showDeleteConfirm ? (
                        <button
                            className="btn-delete-account"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={loading || showPasswordForm}
                        >
                            Delete Account
                        </button>
                    ) : (
                        <form onSubmit={handleDeleteAccount} className="delete-form">
                            <h2>Delete Account</h2>
                            <p className="delete-warning">
                                This action cannot be undone. All your data will be permanently deleted.
                            </p>
                            
                            {deleteError && (
                                <div className="error-message">{deleteError}</div>
                            )}
                            
                            <div className="form-group">
                                <label htmlFor="deletePassword">Enter your password to confirm</label>
                                <input
                                    type="password"
                                    id="deletePassword"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    disabled={deleting}
                                    required
                                    placeholder="Enter your password"
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="btn-confirm-delete"
                                    disabled={deleting}
                                >
                                    {deleting ? 'Deleting...' : 'Delete Account'}
                                </button>
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={handleCancelDelete}
                                    disabled={deleting}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Profile;