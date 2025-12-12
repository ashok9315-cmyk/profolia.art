import React from 'react';
import './HomePage.css';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-container">
      <nav className="navbar">
        <div className="nav-content">
          <div className="logo">🎨 Profolia</div>
          <div className="nav-links">
            {isAuthenticated ? (
              <>
                <a href="/dashboard">Dashboard</a>
                <a href="/profile/edit" className="btn-primary">Create Portfolio</a>
              </>
            ) : (
              <>
                <a href="/login">Login</a>
                <a href="/register" className="btn-primary">Sign Up</a>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1>AI-Powered Portfolio Generator</h1>
          <p>Create stunning, professional portfolios in minutes with AI technology</p>
          {!isAuthenticated && (
            <div className="hero-actions">
              <a href="/register" className="btn btn-large">Get Started Free</a>
              <a href="/login" className="btn btn-secondary">Login</a>
            </div>
          )}
        </div>
      </section>

      <section className="features">
        <h2>Features</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">✨</div>
            <h3>AI-Generated HTML</h3>
            <p>Beautiful portfolios created by AI</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📸</div>
            <h3>Media Management</h3>
            <p>Upload and organize your work</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Professional URLs</h3>
            <p>Custom domain at profolia.art/username</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
