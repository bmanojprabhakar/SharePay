import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ProfileMenu from './components/ProfileMenu';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import AddExpense from './pages/AddExpense';
import SettleUp from './pages/SettleUp';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={<Login onLogin={() => setIsAuthenticated(true)} />}
        />
        <Route
          path="/register"
          element={<Register />}
        />
        <Route
          path="*"
          element={
            isAuthenticated ? (
              <div className="app-container" style={{ position: 'relative' }}>
                <ProfileMenu onLogout={handleLogout} />
                <Sidebar />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/groups" element={<Groups />} />
                    <Route path="/groups/:id" element={<GroupDetails />} />
                    <Route path="/add-expense" element={<AddExpense />} />
                    <Route path="/settle-up" element={<SettleUp />} />
                    <Route path="/profile" element={<Profile />} />
                  </Routes>
                </main>
              </div>
            ) : (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
                <Route path="/register" element={<Register />} />
              </Routes>
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
