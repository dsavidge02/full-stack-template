import { useEffect, useState } from 'react';
import { getUsers } from '../../api/api';
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

function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const data = await getUsers();
                setUsers(data.users || []);
                setError(null);
            } catch (err) {
                setError('Failed to load users');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const getRoleNames = (roleNumbers: number[]): string[] => {
        return roleNumbers.map(role => ROLES_LIST[role] || `UNKNOWN(${role})`);
    };

    if (loading) {
        return (
            <div className="users-container">
                <h1>Users</h1>
                <p>Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="users-container">
                <h1>Users</h1>
                <p className="error">{error}</p>
            </div>
        );
    }

    return (
        <div className="users-container">
            <h1>Users</h1>
            <div className="users-list">
                {users.length === 0 ? (
                    <p>No users found</p>
                ) : (
                    users.map((user) => (
                        <div key={user._id} className="user-item">
                            <span className="username">{user.username}</span>
                            <span className="scopes">
                                {getRoleNames(user.roles).join(', ')}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Users;




