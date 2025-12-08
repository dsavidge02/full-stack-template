import { useEffect } from "react";
import { twitchAxiosPrivate } from "../api/twitchAxios";
import useRefreshToken from "./useRefreshToken";
import { useAuthContext } from "../contexts/AuthContext";

const useTwitchAxiosPrivate = () => {
    const refresh = useRefreshToken();
    const { auth } = useAuthContext();

    useEffect(() => {
        const requestInterceptor = twitchAxiosPrivate.interceptors.request.use(
            config => {
                if (!config.headers['Authorization']) {
                    config.headers['Authorization'] = `Bearer ${auth?.accessToken}`;
                }
                return config;
            },
            error => {
                return Promise.reject(error);
            }
        );

        const responseInterceptor = twitchAxiosPrivate.interceptors.response.use(
            response => response,
            async (error) => {
                const prevRequest = error?.config;
                if (error?.response?.status === 403 && !prevRequest?.sent) {
                    prevRequest.sent = true;
                    const newAccessToken = await refresh();
                    prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return twitchAxiosPrivate(prevRequest);
                }
                return Promise.reject(error);
            }
        );

        return () => {
            twitchAxiosPrivate.interceptors.request.eject(requestInterceptor);
            twitchAxiosPrivate.interceptors.response.eject(responseInterceptor);
        };
    }, [auth, refresh]);

    return twitchAxiosPrivate;
}

export default useTwitchAxiosPrivate;

