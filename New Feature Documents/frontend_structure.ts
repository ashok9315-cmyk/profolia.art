// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfileFormPage from './pages/ProfileFormPage';
import PublicPortfolioPage from './pages/PublicPortfolioPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          } />
          
          <Route path="/profile/edit" element={
            <PrivateRoute>
              <ProfileFormPage />
            </PrivateRoute>
          } />
          
          <Route path="/:username" element={<PublicPortfolioPage />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
  user: any | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/profiles/me`);
      setUser(response.data.profile);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
      email,
      password
    });
    
    const { accessToken: token, refreshToken } = response.data;
    setAccessToken(token);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const register = async (email: string, password: string) => {
    const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
      email,
      password
    });
    
    const { accessToken: token, refreshToken } = response.data;
    setAccessToken(token);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        register,
        logout,
        isAuthenticated: !!accessToken,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// frontend/src/components/PrivateRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// frontend/src/pages/ProfileFormPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const ProfileFormPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    professionType: 'technologist',
    name: '',
    email: '',
    phone: '',
    githubUrl: '',
    websiteUrl: '',
    resumeUrl: '',
    bio: '',
    skills: [] as string[],
    customFields: {}
  });

  const [usernameSuggestions, setUsernameSuggestions] = useState<any[]>([]);
  const [professionFields, setProfessionFields] = useState<any[]>([]);
  const [archiveFile, setArchiveFile] = useState<File | null>(null);

  const professionTypes = [
    { value: 'technologist', label: 'Software Developer / Technologist' },
    { value: 'photographer', label: 'Photographer' },
    { value: 'musician', label: 'Musician' },
    { value: 'dancer', label: 'Dancer' },
    { value: 'artist', label: 'Artist' },
    { value: 'designer', label: 'Designer' }
  ];

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        username: user.username || '',
        professionType: user.professionType || 'technologist',
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        githubUrl: user.githubUrl || '',
        websiteUrl: user.websiteUrl || '',
        bio: user.bio || '',
        skills: user.skills || [],
        customFields: user.customFields || {}
      }));
    }
  }, [user]);

  useEffect(() => {
    if (formData.professionType) {
      fetchProfessionFields();
    }
  }, [formData.professionType]);

  const fetchProfessionFields = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/profiles/profession-fields/${formData.professionType}`
      );
      setProfessionFields(response.data.fields);
    } catch (error) {
      console.error('Failed to fetch profession fields:', error);
    }
  };

  const fetchUsernameSuggestions = async () => {
    if (!formData.name) return;
    
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/profiles/username-suggestions`,
        { params: { name: formData.name } }
      );
      setUsernameSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Failed to fetch username suggestions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Save profile
      await axios.post(`${process.env.REACT_APP_API_URL}/api/profiles/me`, formData);

      // Upload archive if exists
      if (archiveFile) {
        const archiveFormData = new FormData();
        archiveFormData.append('archive', archiveFile);
        
        await axios.post(
          `${process.env.REACT_APP_API_URL}/api/media/upload-archive`,
          archiveFormData,
          {
            headers: { 'Content-Type': 'multipart/form-data' }
          }
        );
      }

      // Generate portfolio
      await axios.post(`${process.env.REACT_APP_API_URL}/api/portfolios/generate`);

      navigate('/dashboard');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-6">Create Your Portfolio</h1>
          
          {/* Progress Steps */}
          <div className="flex mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1">
                <div className={`h-2 rounded ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`} />
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onBlur={fetchUsernameSuggestions}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Profession Type</label>
                  <select
                    value={formData.professionType}
                    onChange={(e) => setFormData({ ...formData, professionType: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {professionTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Portfolio Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    pattern="[a-z0-9-_]+"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Your portfolio will be at: profolia.art/{formData.username}
                  </p>
                  
                  {usernameSuggestions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Suggestions:</p>
                      <div className="flex flex-wrap gap-2">
                        {usernameSuggestions.map((s) => (
                          <button
                            key={s.username}
                            type="button"
                            onClick={() => setFormData({ ...formData, username: s.username })}
                            disabled={!s.available}
                            className={`px-3 py-1 rounded text-sm ${
                              s.available
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {s.username} {!s.available && '(taken)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Professional Details</h2>
                
                {professionFields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium mb-2">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {field.type === 'file' && (
                      <input
                        type="file"
                        accept={field.name === 'mediaArchive' ? '.zip' : '*'}
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            if (field.name === 'mediaArchive') {
                              setArchiveFile(e.target.files[0]);
                            }
                          }
                        }}
                        className="w-full px-4 py-2 border rounded-lg"
                        required={field.required}
                      />
                    )}
                    
                    {field.type === 'url' && (
                      <input
                        type="url"
                        value={(formData as any)[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        required={field.required}
                      />
                    )}
                  </div>
                ))}

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Review & Generate</h2>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium">Portfolio URL:</p>
                  <p className="text-blue-600">profolia.art/{formData.username}</p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate Portfolio'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileFormPage;