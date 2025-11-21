import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Home from './pages/Home/Home';
import Users from './pages/Users/Users';
import Profile from './pages/Profile/Profile';

function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/users" element={<Users />} />
                <Route path="/profile" element={<Profile />} />
            </Routes>
        </BrowserRouter>
    )
}

export default Router;