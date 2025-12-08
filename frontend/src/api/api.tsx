import { AxiosInstance } from "axios";

export const getUsers = async (axiosInstance: AxiosInstance) => {
    const response = await axiosInstance.get('/users');
    return response.data;
}

export const deleteUser = async (axiosInstance: AxiosInstance, userId: string) => {
    const response = await axiosInstance.post('/users/delete', { userId });
    return response.data;
}

export const updateUserRoles = async (axiosInstance: AxiosInstance, userId: string, roles: number[]) => {
    const response = await axiosInstance.post('/users/roles', { userId, roles });
    return response.data;
}

export const unlockUser = async (axiosInstance: AxiosInstance, userId: string) => {
    const response = await axiosInstance.post('/users/unlock', { userId });
    return response.data;
}

export const changePassword = async (axiosInstance: AxiosInstance, currentPassword: string, newPassword: string) => {
    const response = await axiosInstance.post('/user/password', { 
        password: currentPassword, 
        newPassword: newPassword 
    });
    return response.data;
}

export const deleteSelf = async (axiosInstance: AxiosInstance, password: string) => {
    const response = await axiosInstance.post('/user/delete', { password });
    return response.data;
}

export const exchangeTwitchCode = async (axiosInstance: AxiosInstance, code: string) => {
    const response = await axiosInstance.post('/token/exchange', { code });
    return response.data;
}

export const getTwitchAdminToken = async (axiosInstance: AxiosInstance) => {
    const response = await axiosInstance.get('/admin/token');
    return response.data;
}

export const exchangeTwitchAdminToken = async (axiosInstance: AxiosInstance, code: string) => {
    const response = await axiosInstance.post('/admin/exchange', { code });
    return response.data;
}

export const getChannelFollowers = async (axiosInstance: AxiosInstance, userId?: string) => {
    const url = userId ? `/channel/followers?userId=${userId}` : '/channel/followers';
    const response = await axiosInstance.get(url);
    return response.data;
}

export const getChannelSubscribers = async (axiosInstance: AxiosInstance, userId?: string) => {
    const url = userId ? `/channel/subscribers?userId=${userId}` : '/channel/subscribers';
    const response = await axiosInstance.get(url);
    return response.data;
}

export const verifyTwitchUserByCode = async (axiosInstance: AxiosInstance, code: string) => {
    const response = await axiosInstance.post('/token/verify', { code });
    return response.data;
}

// EventSub WebSocket Management
export const startEventSubWebSocket = async (axiosInstance: AxiosInstance) => {
    const response = await axiosInstance.post('/eventsub/websocket/start');
    return response.data;
}

export const stopEventSubWebSocket = async (axiosInstance: AxiosInstance) => {
    const response = await axiosInstance.post('/eventsub/websocket/stop');
    return response.data;
}

export const getEventSubWebSocketStatus = async (axiosInstance: AxiosInstance) => {
    const response = await axiosInstance.get('/eventsub/websocket/status');
    return response.data;
}

// EventSub Subscription Management
export const createEventSubSubscription = async (axiosInstance: AxiosInstance, type: string, broadcasterUserId?: string, moderatorUserId?: string, userId?: string) => {
    const response = await axiosInstance.post('/eventsub/subscriptions', { 
        type, 
        broadcasterUserId, 
        moderatorUserId,
        userId
    });
    return response.data;
}

export const getEventSubSubscriptions = async (axiosInstance: AxiosInstance, type?: string) => {
    const url = type ? `/eventsub/subscriptions?type=${type}` : '/eventsub/subscriptions';
    const response = await axiosInstance.get(url);
    return response.data;
}

export const getEventSubSubscription = async (axiosInstance: AxiosInstance, type: string) => {
    const response = await axiosInstance.get(`/eventsub/subscriptions/${type}`);
    return response.data;
}

export const deleteEventSubSubscription = async (axiosInstance: AxiosInstance, type: string) => {
    const response = await axiosInstance.delete(`/eventsub/subscriptions/${type}`);
    return response.data;
}