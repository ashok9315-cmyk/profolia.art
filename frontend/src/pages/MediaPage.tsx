import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api.client';
import './MediaPage.css';

interface MediaAsset {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize?: number;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt?: string;
}

const readableSize = (size?: number) => {
  if (!size) return '—';
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const sizes = ['B', 'KB', 'MB', 'GB'];
  return `${(size / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const MediaPage: React.FC = () => {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zipUploading, setZipUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedZip, setSelectedZip] = useState<File | null>(null);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/media');
      setMedia(response.data.media || []);
    } catch (err) {
      setError('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedZip(e.target.files[0]);
    }
  };

  const uploadSingle = async () => {
    if (!selectedFile) {
      setError('Please choose a file to upload');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      await apiClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSelectedFile(null);
      await loadMedia();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const uploadZip = async () => {
    if (!selectedZip) {
      setError('Please choose a ZIP file to upload');
      return;
    }
    setError(null);
    setZipUploading(true);
    try {
      const formData = new FormData();
      formData.append('zip', selectedZip);
      await apiClient.post('/media/upload-zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSelectedZip(null);
      await loadMedia();
    } catch (err: any) {
      setError(err.response?.data?.error || 'ZIP upload failed');
    } finally {
      setZipUploading(false);
    }
  };

  const deleteMedia = async (id: string) => {
    if (!window.confirm('Delete this media item?')) return;
    try {
      await apiClient.delete(`/media/${id}`);
      setMedia(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  const renderThumbnail = (item: MediaAsset) => {
    const type = item.fileType?.toLowerCase() || '';
    if (type.startsWith('image/')) {
      return <img src={item.fileUrl} alt={item.fileName} />;
    }
    if (type.startsWith('video/')) {
      return <div className="thumb-icon">🎬</div>;
    }
    if (type.startsWith('audio/')) {
      return <div className="thumb-icon">🎵</div>;
    }
    return <div className="thumb-icon">📄</div>;
  };

  return (
    <div className="media-page">
      <div className="media-header">
        <div>
          <h1>Media Library</h1>
          <p>Upload files or a ZIP archive and manage your assets.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="upload-panels">
        <div className="panel">
          <h3>Single File Upload</h3>
          <p>Images, audio, video, or documents.</p>
          <input type="file" onChange={handleFileChange} />
          <button
            className="btn-primary"
            onClick={uploadSingle}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>

        <div className="panel">
          <h3>ZIP Upload</h3>
          <p>Upload a ZIP to add multiple files at once.</p>
          <input type="file" accept=".zip" onChange={handleZipChange} />
          <button
            className="btn-secondary"
            onClick={uploadZip}
            disabled={zipUploading}
          >
            {zipUploading ? 'Uploading...' : 'Upload ZIP'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading media...</div>
      ) : media.length === 0 ? (
        <div className="empty">No media yet. Upload your first file!</div>
      ) : (
        <div className="media-grid">
          {media.map(item => (
            <div key={item.id} className="media-card">
              <div className="thumb">{renderThumbnail(item)}</div>
              <div className="meta">
                <div className="name" title={item.fileName}>{item.fileName}</div>
                <div className="meta-row">
                  <span>{item.fileType || 'Unknown type'}</span>
                  <span>{readableSize(item.fileSize)}</span>
                </div>
                {item.category && <div className="badge">{item.category}</div>}
                {item.tags && item.tags.length > 0 && (
                  <div className="tags">
                    {item.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="actions">
                  <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-link">Open</a>
                  <button className="btn-danger" onClick={() => deleteMedia(item.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaPage;
