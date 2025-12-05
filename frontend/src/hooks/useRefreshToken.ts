import { axiosPrivate } from '../api/axios';
import { useAuthContext } from '../contexts/AuthContext';
import { decodeToken } from '../utils/decodeToken';

const useRefreshToken = () => {
    const { setAuth } = useAuthContext();
    const refresh = async () => {
        const response = await axiosPrivate.get('/refresh');
        const newAuth = decodeToken(response?.data.accessToken);
        if (newAuth) {
            setAuth({
                accessToken: newAuth?.accessToken,
                user: newAuth?.user || null,
            });
        }
        return response?.data.accessToken;
    }
    return refresh;
}

export default useRefreshToken;