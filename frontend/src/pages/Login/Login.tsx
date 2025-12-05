import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import './Login.css';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const { doLogin } = useAuthContext();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsLocked(false);
        setLoading(true);

        if (!username || !password) {
            setError('Username and password are required');
            setLoading(false);
            return;
        }

        const result = await doLogin({ username, password });
        
        if (result.success) {
            navigate('/');
        } else {
            setError(result.message || 'Login failed. Please check your credentials.');
            // Check if account is locked (status 423)
            setIsLocked(result.status === 423);
        }
        
        setLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Login</h1>
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading || isLocked}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading || isLocked}
                            required
                        />
                    </div>
                    {error && (
                        <div className={`error-message ${isLocked ? 'locked-message' : ''}`}>
                            {error}
                        </div>
                    )}
                    <button 
                        type="submit" 
                        disabled={loading || isLocked} 
                        className="submit-button"
                    >
                        {loading ? 'Logging in...' : isLocked ? 'Account Locked' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;

