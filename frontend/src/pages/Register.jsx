import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
const validateMobile = (mobile) => /^\d{10}$/.test(mobile);

const Register = () => {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
    if (!validateMobile(mobile)) {
      err.mobile = 'Mobile must be 10 digits';
      valid = false;
    }
    if (!password || password.length < 6) {
      err.password = 'Password must be at least 6 characters';
      valid = false;
    }
    if (password !== confirm) {
      err.confirm = 'Passwords do not match';
      valid = false;
    }
    setError(err);
    if (valid) {
      alert('Registration successful! (Mock)');
      navigate('/login');
    }
  };

  return (
    <div className="auth-bg">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Register</h2>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          {error.email && <div className="error-text">{error.email}</div>}
        </div>
        <div className="form-group">
          <label>Mobile</label>
          <input type="text" value={mobile} onChange={e => setMobile(e.target.value)} />
          {error.mobile && <div className="error-text">{error.mobile}</div>}
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {error.password && <div className="error-text">{error.password}</div>}
        </div>
        <div className="form-group">
          <label>Confirm Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          {error.confirm && <div className="error-text">{error.confirm}</div>}
        </div>
        <button type="submit" className="auth-btn">Register</button>
        <button type="button" className="link-btn" onClick={() => navigate('/login')}>Back to Login</button>
      </form>
    </div>
  );
};

export default Register;
