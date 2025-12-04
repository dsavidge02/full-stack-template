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