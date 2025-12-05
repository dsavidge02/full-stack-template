import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

const DenyAuth = () => {
    const { getUser, loading } = useAuthContext();
    const user = getUser();

    // Wait for initial auth check to complete before making routing decisions
    if (loading) {
        return null; // Or return a loading spinner component
    }

    return (
        !user
            ? <Outlet />
            : <Navigate to="/profile" />
    )
};

export default DenyAuth;