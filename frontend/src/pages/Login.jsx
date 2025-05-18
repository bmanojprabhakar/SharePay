import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleIcon from '@mui/icons-material/Google';
import './Auth.css';

const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState({});
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    let valid = true;
    let err = {};
    if (!validateEmail(email)) {
      err.email = 'Invalid email address';
      valid = false;
    }
    if (!password || password.length < 6) {
      err.password = 'Password must be at least 6 characters';
      valid = false;
    }
    setError(err);
    if (valid) {
      onLogin();
      navigate('/', { replace: true });
    }
  };

  const handleGoogleSignIn = () => {
    alert('Google OAuth2 sign-in would be triggered here.');
    onLogin(); // Mock login
  };

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #f472b6 100%)', position: 'fixed', top: 0, left: 0, width: '100vw', zIndex: 1000 }}>
      <div className="card shadow-lg p-4" style={{ minWidth: 350, maxWidth: 420, width: '100%' }}>
        <form onSubmit={handleSubmit}>
          <h2 className="mb-4 text-center">Login</h2>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input type="text" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
            {error.email && <div className="text-danger small mt-1">{error.email}</div>}
          </div>
          <div className="mb-2">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} />
            {error.password && <div className="text-danger small mt-1">{error.password}</div>}
          </div>
          <div className="mb-3 text-end">
            <button type="button" className="btn btn-link p-0" style={{ fontSize: '1rem' }} onClick={() => alert('Forgot password flow coming soon!')}>Forgot password?</button>
          </div>
          <button type="submit" className="btn btn-primary w-100 mb-3">Login</button>
          <div className="d-flex align-items-center my-3">
            <hr className="flex-grow-1" />
            <span className="mx-2 text-muted">or</span>
            <hr className="flex-grow-1" />
          </div>
          <button type="button" className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center mb-3" onClick={handleGoogleSignIn}>
            <GoogleIcon style={{ marginRight: 8 }} /> Sign in with Google
          </button>
          <div className="text-center mt-2">
            <span>Don't have an account?</span>
            <button type="button" className="btn btn-link p-0 ms-1" style={{ fontSize: '1rem' }} onClick={() => navigate('/register')}>Register</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
