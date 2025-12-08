// frontend/src/api/twitchAxios.tsx
import axios from 'axios';
// const TWITCH_BASE_URL = 'http://localhost:4001'; // Local development
const TWITCH_BASE_URL = '/twitch/'; // Production

export default axios.create({
    baseURL: TWITCH_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

export const twitchAxiosPrivate = axios.create({
    baseURL: TWITCH_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

