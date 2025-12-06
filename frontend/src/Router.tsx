import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import Users from './pages/Users/Users';
import Profile from './pages/Profile/Profile';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Unauthorized from './pages/Unauthorized/Unauthorized';
import Twitch from './pages/Twitch/Twitch';
import Admin from './pages/Admin/Admin';

import RequireAuth from './components/Auth/RequireAuth';
import DenyAuth from './components/Auth/DenyAuth';

function Router() {
    return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/twitch" element={<Twitch />} />

                <Route element={<DenyAuth />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Route>

                <Route element={<RequireAuth allowedRoles={[1992]} />}>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                </Route>

                <Route element={<RequireAuth allowedRoles={[2002]} />}>
                    <Route path="/users" element={<Users />} />
                    <Route path="/admin" element={<Admin />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default Router;