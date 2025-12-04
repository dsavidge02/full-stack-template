import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

const DenyAuth = () => {
    const { getUser } = useAuthContext();
    const user = getUser();

    return (
        !user
            ? <Outlet />
            : <Navigate to="/profile" />
    )
};

export default DenyAuth;