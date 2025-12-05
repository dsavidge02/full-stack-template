import axios from 'axios';
const BASE_URL = 'http://localhost:4000'; //Local develoment
// const BASE_URL = '/auth/'; //Production

export default axios.create({
    baseURL: BASE_URL
});

export const axiosPrivate = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

export const axiosAuthUnprotected = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});