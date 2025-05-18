import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import GoogleIcon from '@mui/icons-material/Google';

const Home = () => {
  return (
    <div className="full-screen-container">
      <div className="top-left-logo">
        <img src="/src/assets/SharePay_Logo.svg" alt="SharePay Logo" className="logo" />
        <h1>SharePay</h1>
      </div>
      <div className="top-right-buttons">
        <Link to="/login" className="btn btn-outline-primary btn-sm">Login</Link>
        <Link to="/signup" className="btn btn-primary btn-sm ms-2">Sign Up</Link>
      </div>
      <div className="content-wrapper">
        <div className="description-container">
          <p className="description">SharePay makes splitting expenses with friends, roommates, or groups effortless and stress-free. Whether it’s a weekend trip, dinner outing, or monthly rent, SharePay keeps track of who owes what — so you never have to do the math again. With real-time syncing, clear summaries, and smart reminders, SharePay ensures that everyone pays their fair share—easily and transparently.</p>
          <Link to="/signup" className="btn btn-primary">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
