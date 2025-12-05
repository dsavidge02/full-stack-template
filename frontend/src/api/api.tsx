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