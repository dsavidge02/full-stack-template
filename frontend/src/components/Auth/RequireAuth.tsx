import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

const RequireAuth = ({ allowedRoles }: { allowedRoles: number[] }) => {
    const location = useLocation();
    const { getUser } = useAuthContext();


    const user = getUser();
    const roles = user?.roles || [];

    return (
        roles.find(role => allowedRoles?.includes(role))
            ? <Outlet />
            : user
                ? <Navigate to="/unauthorized" state={{ from: location }} replace />
                : <Navigate to="/login" state={{ from: location }} replace />
    )
}

export default RequireAuth;