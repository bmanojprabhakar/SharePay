import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser } from 'react-icons/fi';
import './ProfileMenu.css';

const ProfileMenu = ({ onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="profile-menu-container" ref={ref}>
      <button className="profile-icon-btn" onClick={() => setOpen((o) => !o)}>
        <FiUser size={28} />
      </button>
      {open && (
        <div className="profile-dropdown">
          <button className="dropdown-item" onClick={() => { setOpen(false); navigate('/profile'); }}>User Profile</button>
          <button className="dropdown-item" onClick={onLogout}>Logout</button>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
