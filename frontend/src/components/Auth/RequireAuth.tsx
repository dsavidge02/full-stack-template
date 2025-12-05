import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

const RequireAuth = ({ allowedRoles }: { allowedRoles: number[] }) => {
    const location = useLocation();
    const { getUser, loading } = useAuthContext();

    const user = getUser();
    const roles = user?.roles || [];

    // Wait for initial auth check to complete before making routing decisions
    if (loading) {
        return null; // Or return a loading spinner component
    }

    return (
        roles.find(role => allowedRoles?.includes(role))
            ? <Outlet />
            : user
                ? <Navigate to="/unauthorized" state={{ from: location }} replace />
                : <Navigate to="/login" state={{ from: location }} replace />
    )
}

export default RequireAuth;