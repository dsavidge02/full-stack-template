import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar/Navbar';
import HealthBanner from './components/HealthBanner/HealthBanner';
import Home from './pages/Home/Home';
import Users from './pages/Users/Users';
import Profile from './pages/Profile/Profile';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Unauthorized from './pages/Unauthorized/Unauthorized';
import Twitch from './pages/Twitch/Twitch';
import Admin from './pages/Admin/Admin';
import RegisterCallback from './pages/Register/RegisterCallback';
import About from './pages/About/About';
import Dashboard from './pages/Dashboard/Dashboard';

import RequireAuth from './components/Auth/RequireAuth';
import DenyAuth from './components/Auth/DenyAuth';

function RouterContent() {
    const location = useLocation();
    const isDashboard = location.pathname === '/twitch/dashboard';

    return (
        <>
            {!isDashboard && <HealthBanner />}
            {!isDashboard && <Navbar />}
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/twitch" element={<Twitch />} />
                <Route path="/twitch/dashboard" element={<Dashboard />} />
                <Route path="/about" element={<About />} />

                <Route element={<DenyAuth />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/register/callback" element={<RegisterCallback />} />
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
        </>
    );
}

function Router() {
    return (
        <BrowserRouter>
            <RouterContent />
        </BrowserRouter>
    );
}

export default Router;