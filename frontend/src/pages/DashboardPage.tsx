import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const { profile, logout } = useAuth();

  if (!profile) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Profolia Dashboard</h2>
        <button onClick={logout} className="logout-btn">Logout</button>
      </nav>

      <div className="dashboard-content">
        <h1>Welcome, {profile.name}!</h1>
        
        <div className="profile-card">
          <h3>Your Portfolio</h3>
          <p><strong>Username:</strong> {profile.username}</p>
          <p><strong>Profession:</strong> {profile.professionType}</p>
          <p><strong>Status:</strong> {profile.isPublished ? '✅ Published' : '⏳ Draft'}</p>
          {profile.isPublished && (
            <p><strong>URL:</strong> <a href={`https://www.profolia.art/${profile.username}`} target="_blank" rel="noopener noreferrer">
              profolia.art/{profile.username}
            </a></p>
          )}
        </div>

        <div className="dashboard-actions">
          <a href="/profile/edit" className="btn btn-primary">Edit Profile</a>
          <a href="/portfolio/generate" className="btn btn-secondary">Generate Portfolio</a>
          <a href="/media" className="btn btn-secondary">Manage Media</a>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
