import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import './Navbar.css';

const ADMIN_ROLE = 2002;

function Navbar() {
    const { auth, doLogout } = useAuthContext();
    const navigate = useNavigate();
    const isLoggedIn = !!auth.user;
    const isAdmin = isLoggedIn && auth.user?.roles?.includes(ADMIN_ROLE);

    const handleLogout = async () => {
        await doLogout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand">
                    Savidge Apps
                </Link>
                <div className="navbar-links">
                    <Link to="/" className="navbar-link">Home</Link>
                    <Link to="/twitch" className="navbar-link">Twitch</Link>
                    <Link to="/about" className="navbar-link">About</Link>
                    {isLoggedIn ? (
                        <>
                            {isAdmin && (
                                <>
                                    <Link to="/users" className="navbar-link">Users</Link>
                                    <Link to="/admin" className="navbar-link">Admin</Link>
                                </>
                            )}
                            <Link to="/profile" className="navbar-link">Profile</Link>
                            <button onClick={handleLogout} className="navbar-button">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="navbar-link">Login</Link>
                            <Link to="/register" className="navbar-link">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;

