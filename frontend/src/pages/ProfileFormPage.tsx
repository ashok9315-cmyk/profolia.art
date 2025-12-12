import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api.client';
import './ProfileFormPage.css';

interface ProfessionField {
  name: string;
  type: 'text' | 'email' | 'url' | 'number' | 'textarea';
  label: string;
  placeholder?: string;
  required?: boolean;
}

interface FormData {
  username: string;
  name: string;
  email: string;
  phone: string;
  professionType: string;
  githubUrl: string;
  websiteUrl: string;
  resumeUrl: string;
  bio: string;
  skills: string;
  customFields: Record<string, string>;
}

const PROFESSION_TYPES = [
  'technologist',
  'photographer',
  'musician',
  'designer',
  'artist',
  'entrepreneur',
  'other'
];

const ProfileFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [professionFields, setProfessionFields] = useState<ProfessionField[]>([]);
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    username: profile?.username || '',
    name: profile?.name || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    professionType: profile?.professionType || 'technologist',
    githubUrl: profile?.githubUrl || '',
    websiteUrl: profile?.websiteUrl || '',
    resumeUrl: profile?.resumeUrl || '',
    bio: profile?.bio || '',
    skills: Array.isArray(profile?.skills) ? profile.skills.join(', ') : '',
    customFields: profile?.customFields || {}
  });

  // Fetch profession-specific fields when profession changes
  useEffect(() => {
    const fetchProfessionFields = async () => {
      try {
        const response = await apiClient.get(
          `/profiles/fields/${formData.professionType}`
        );
        setProfessionFields(response.data.fields || []);
      } catch (err) {
        console.error('Error fetching profession fields:', err);
      }
    };

    fetchProfessionFields();
  }, [formData.professionType]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
    setSuccess(false);
  };

  const handleCustomFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value
      }
    }));
  };

  // Check username availability
  const checkUsername = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    setUsernameChecking(true);
    try {
      const response = await apiClient.get(`/profiles/check-username?username=${username}`);
      if (response.data.available) {
        setUsernameError(null);
      } else {
        setUsernameError('Username is already taken');
      }
    } catch (err) {
      setUsernameError('Error checking username');
    } finally {
      setUsernameChecking(false);
    }
  };

  // Generate username suggestions
  const generateUsernameSuggestions = async () => {
    if (!formData.name) {
      setError('Please enter your name first');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/profiles/suggestions', {
        name: formData.name
      });
      setUsernameSuggestions(response.data.suggestions || []);
      setShowUsernameSuggestions(true);
    } catch (err) {
      setError('Error generating username suggestions');
    } finally {
      setLoading(false);
    }
  };

  // Select a suggested username
  const selectSuggestedUsername = async (username: string) => {
    setFormData(prev => ({
      ...prev,
      username
    }));
    setShowUsernameSuggestions(false);
    await checkUsername(username);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username) {
      setError('Username is required');
      return;
    }

    if (usernameError) {
      setError('Please choose a valid username');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        username: formData.username,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        professionType: formData.professionType,
        githubUrl: formData.githubUrl,
        websiteUrl: formData.websiteUrl,
        resumeUrl: formData.resumeUrl,
        bio: formData.bio,
        skills: formData.skills
          .split(',')
          .map(s => s.trim())
          .filter(s => s),
        customFields: formData.customFields
      };

      await apiClient.post('/profiles', payload);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error saving profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-form-container">
      <div className="profile-form-wrapper">
        <h1>Create Your Profile</h1>
        <p className="form-subtitle">
          Let's set up your professional portfolio
        </p>

        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">
            Profile saved successfully! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          {/* Username Section */}
          <div className="form-section">
            <h2>Username</h2>
            <div className="form-group">
              <label htmlFor="username">Your Profile URL</label>
              <div className="username-input-group">
                <span className="url-prefix">profolia.art/</span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  onBlur={() => checkUsername(formData.username)}
                  placeholder="your-username"
                  disabled={loading}
                  className={usernameError ? 'input-error' : ''}
                />
              </div>
              {usernameError && (
                <span className="field-error">{usernameError}</span>
              )}
              {usernameChecking && (
                <span className="checking">Checking availability...</span>
              )}
              <button
                type="button"
                className="btn-secondary btn-suggestions"
                onClick={generateUsernameSuggestions}
                disabled={loading || !formData.name}
              >
                Get Suggestions
              </button>
            </div>

            {/* Username Suggestions */}
            {showUsernameSuggestions && (
              <div className="suggestions-list">
                <p className="suggestions-title">Suggested Usernames:</p>
                <div className="suggestions-grid">
                  {usernameSuggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      className="suggestion-btn"
                      onClick={() => selectSuggestedUsername(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Basic Info Section */}
          <div className="form-section">
            <h2>Basic Information</h2>

            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="professionType">Profession Type *</label>
              <select
                id="professionType"
                name="professionType"
                value={formData.professionType}
                onChange={handleInputChange}
                disabled={loading}
              >
                {PROFESSION_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Links Section */}
          <div className="form-section">
            <h2>Links & URLs</h2>

            <div className="form-group">
              <label htmlFor="githubUrl">GitHub URL</label>
              <input
                type="url"
                id="githubUrl"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={handleInputChange}
                placeholder="https://github.com/username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="websiteUrl">Personal Website</label>
              <input
                type="url"
                id="websiteUrl"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleInputChange}
                placeholder="https://yourwebsite.com"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="resumeUrl">Resume/CV URL</label>
              <input
                type="url"
                id="resumeUrl"
                name="resumeUrl"
                value={formData.resumeUrl}
                onChange={handleInputChange}
                placeholder="https://drive.google.com/file/..."
                disabled={loading}
              />
            </div>
          </div>

          {/* Bio & Skills Section */}
          <div className="form-section">
            <h2>About You</h2>

            <div className="form-group">
              <label htmlFor="bio">Professional Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself, your experience, and what you're passionate about..."
                rows={5}
                disabled={loading}
              />
              <span className="field-hint">
                {formData.bio.length} / 1000 characters
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="skills">Skills (comma-separated)</label>
              <textarea
                id="skills"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                placeholder="e.g., React, TypeScript, UI Design, Photography"
                rows={3}
                disabled={loading}
              />
              <span className="field-hint">Separate skills with commas</span>
            </div>
          </div>

          {/* Profession-Specific Fields */}
          {professionFields.length > 0 && (
            <div className="form-section">
              <h2>{formData.professionType.charAt(0).toUpperCase() + formData.professionType.slice(1)} Specific</h2>

              {professionFields.map(field => (
                <div key={field.name} className="form-group">
                  <label htmlFor={field.name}>
                    {field.label}
                    {field.required && ' *'}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.name}
                      value={formData.customFields[field.name] || ''}
                      onChange={e =>
                        handleCustomFieldChange(field.name, e.target.value)
                      }
                      placeholder={field.placeholder}
                      disabled={loading}
                      rows={3}
                    />
                  ) : (
                    <input
                      type={field.type}
                      id={field.name}
                      value={formData.customFields[field.name] || ''}
                      onChange={e =>
                        handleCustomFieldChange(field.name, e.target.value)
                      }
                      placeholder={field.placeholder}
                      disabled={loading}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !!usernameError}
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileFormPage;
