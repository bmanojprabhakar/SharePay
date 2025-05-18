import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => (
  <nav className="sidebar">
    <h2 className="sidebar-title">Share Pay</h2>
    <ul className="sidebar-nav">
      <li><NavLink to="/" end>Dashboard</NavLink></li>
      <li><NavLink to="/groups">Groups</NavLink></li>
      <li><NavLink to="/add-expense">Add Expense</NavLink></li>
      <li><NavLink to="/settle-up">Settle Up</NavLink></li>

    </ul>
  </nav>
);

export default Sidebar;
