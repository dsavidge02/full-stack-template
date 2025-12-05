import { useLocation, Link } from 'react-router-dom';
import './Unauthorized.css';

function Unauthorized() {
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    return (
        <div className="unauthorized-container">
            <div className="unauthorized-content">
                <h1 className="unauthorized-title">403</h1>
                <h2 className="unauthorized-subtitle">Access Denied</h2>
                <p className="unauthorized-message">
                    You don't have permission to access this page.
                </p>
                <p className="unauthorized-details">
                    You tried to access: <span className="path">{from}</span>
                </p>
                <div className="unauthorized-actions">
                    <Link to="/" className="btn-home">
                        Go to Home
                    </Link>
                    <Link to="/profile" className="btn-profile">
                        Go to Profile
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Unauthorized;


