import { useEffect, useState } from 'react';
import { getUsers, deleteUser, updateUserRoles } from '../../api/api';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import './Users.css';

interface User {
    _id: string;
    username: string;
    email: string;
    roles: number[];
    twitch_user_id?: string;
}

const ROLES_LIST: { [key: number]: string } = {
    2002: 'ADMIN',
    1992: 'USER'
};

const ROLE_VALUES = Object.keys(ROLES_LIST).map(Number);

function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editingRoles, setEditingRoles] = useState<number[]>([]);
    const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);
    const axiosPrivate = useAxiosPrivate();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const data = await getUsers(axiosPrivate);
                console.log(data);
                setUsers(data.users || []);
                setError(null);
            } catch (err: any) {
                if (err?.response?.status === 403) {
                    setError('Access denied. Admin permissions required.');
                } else if (err?.response?.status === 401) {
                    setError('Authentication required. Please log in.');
                } else {
                    setError('Failed to load users');
                }
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [axiosPrivate]);

    const getRoleNames = (roleNumbers: number[]): string[] => {
        return roleNumbers.map(role => ROLES_LIST[role] || `UNKNOWN(${role})`);
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            setUpdating(true);
            await deleteUser(axiosPrivate, userId);
            setUsers(users.filter(user => user._id !== userId));
            setDeleteConfirmUserId(null);
            setError(null);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to delete user');
            console.error(err);
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateRoles = async (userId: string, newRoles: number[]) => {
        try {
            setUpdating(true);
            await updateUserRoles(axiosPrivate, userId, newRoles);
            setUsers(users.map(user => 
                user._id === userId ? { ...user, roles: newRoles } : user
            ));
            setEditingUserId(null);
            setEditingRoles([]);
            setError(null);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to update user roles');
            console.error(err);
        } finally {
            setUpdating(false);
        }
    };

    const handleStartEdit = (user: User) => {
        setEditingUserId(user._id);
        setEditingRoles([...user.roles]);
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
        setEditingRoles([]);
    };

    const handleSaveRoles = (userId: string) => {
        handleUpdateRoles(userId, editingRoles);
    };

    const handleRoleToggle = (role: number) => {
        setEditingRoles(prev => 
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        );
    };

    if (loading) {
        return (
            <div className="users-container">
                <h1>Users</h1>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="users-container">
            <h1>Users</h1>
            {error && <p className="error">{error}</p>}
            <div className="users-list">
                {users.length === 0 ? (
                    <p>No users found</p>
                ) : (
                    users.map((user) => (
                        <div key={user._id} className="user-item">
                            <div className="user-info">
                                <span className="username">{user.username}</span>
                                <span className="email">{user.email}</span>
                                {editingUserId === user._id ? (
                                    <div className="roles-editor">
                                        {ROLE_VALUES.map(role => (
                                            <label key={role} className="role-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={editingRoles.includes(role)}
                                                    onChange={() => handleRoleToggle(role)}
                                                    disabled={updating}
                                                />
                                                <span>{ROLES_LIST[role]}</span>
                                            </label>
                                        ))}
                                        <div className="editor-actions">
                                            <button
                                                className="btn-save"
                                                onClick={() => handleSaveRoles(user._id)}
                                                disabled={updating}
                                            >
                                                Save
                                            </button>
                                            <button
                                                className="btn-cancel"
                                                onClick={handleCancelEdit}
                                                disabled={updating}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="scopes">
                                        {getRoleNames(user.roles).join(', ')}
                                    </span>
                                )}
                            </div>
                            <div className="user-actions">
                                {editingUserId !== user._id && (
                                    <>
                                        <button
                                            className="btn-edit"
                                            onClick={() => handleStartEdit(user)}
                                            disabled={updating || editingUserId !== null}
                                        >
                                            Edit Roles
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => setDeleteConfirmUserId(user._id)}
                                            disabled={updating || deleteConfirmUserId !== null}
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}
                            </div>
                            {deleteConfirmUserId === user._id && (
                                <div className="delete-confirm">
                                    <p>Are you sure you want to delete {user.username}?</p>
                                    <div className="confirm-buttons">
                                        <button
                                            className="btn-confirm-delete"
                                            onClick={() => handleDeleteUser(user._id)}
                                            disabled={updating}
                                        >
                                            Yes, Delete
                                        </button>
                                        <button
                                            className="btn-cancel"
                                            onClick={() => setDeleteConfirmUserId(null)}
                                            disabled={updating}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Users;




