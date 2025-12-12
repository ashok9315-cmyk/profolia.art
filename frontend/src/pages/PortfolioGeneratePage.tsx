import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api.client';
import './PortfolioGeneratePage.css';

interface PortfolioItem {
  id: string;
  s3Url?: string;
  cloudfrontUrl?: string;
  templateVersion?: string;
  createdAt?: string;
}

const PortfolioGeneratePage: React.FC = () => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<PortfolioItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await apiClient.get('/portfolios/history');
      setHistory(response.data.portfolios || []);
    } catch (err) {
      setError('Failed to load portfolio history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleGenerate = async () => {
    setError(null);
    setSuccessUrl(null);
    setGenerating(true);
    try {
      const response = await apiClient.post('/portfolios/generate');
      const url = response.data.cloudfrontUrl || response.data.s3Url;
      setSuccessUrl(url || null);
      await loadHistory();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate portfolio');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <div>
          <h1>Generate Portfolio</h1>
          <p>Create a fresh AI-generated portfolio from your profile and media.</p>
        </div>
        <button
          className="btn-primary"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'Generating...' : 'Generate Now'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {successUrl && (
        <div className="success-banner">
          <span>Portfolio generated!</span>
          <a href={successUrl} target="_blank" rel="noopener noreferrer">Open</a>
        </div>
      )}

      <section className="history">
        <div className="history-header">
          <h3>Generation History</h3>
          {loadingHistory && <span className="small">Loading...</span>}
        </div>
        {history.length === 0 ? (
          <div className="empty">No portfolios yet. Generate your first one!</div>
        ) : (
          <div className="history-grid">
            {history.map(item => (
              <div key={item.id} className="history-card">
                <div className="row">
                  <span className="label">Version</span>
                  <span className="value">{item.templateVersion || 'latest'}</span>
                </div>
                <div className="row">
                  <span className="label">Created</span>
                  <span className="value">{formatDate(item.createdAt)}</span>
                </div>
                <div className="links">
                  {item.cloudfrontUrl && (
                    <a href={item.cloudfrontUrl} target="_blank" rel="noopener noreferrer">CloudFront</a>
                  )}
                  {item.s3Url && (
                    <a href={item.s3Url} target="_blank" rel="noopener noreferrer">S3</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PortfolioGeneratePage;
