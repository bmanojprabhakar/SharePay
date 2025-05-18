import React from 'react';

const Dashboard = () => (
  <div>
    <h1 style={{ color: '#6366f1', marginBottom: '1.5rem' }}>Dashboard</h1>
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div style={{ background: 'linear-gradient(135deg, #f472b6 0%, #facc15 100%)', color: '#fff', borderRadius: '16px', padding: '2rem', minWidth: '200px', boxShadow: '0 4px 16px #f472b655' }}>
        <h2>Total Balance</h2>
        <p style={{ fontSize: '2rem', margin: '1rem 0 0' }}>₹0</p>
      </div>
      <div style={{ background: 'linear-gradient(135deg, #34d399 0%, #60a5fa 100%)', color: '#fff', borderRadius: '16px', padding: '2rem', minWidth: '200px', boxShadow: '0 4px 16px #34d39955' }}>
        <h2>Groups</h2>
        <p style={{ fontSize: '2rem', margin: '1rem 0 0' }}>0</p>
      </div>
      <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)', color: '#fff', borderRadius: '16px', padding: '2rem', minWidth: '200px', boxShadow: '0 4px 16px #a78bfa55' }}>
        <h2>Recent Activity</h2>
        <p style={{ margin: '1rem 0 0' }}>No activity yet!</p>
      </div>
    </div>
  </div>
);

export default Dashboard;
