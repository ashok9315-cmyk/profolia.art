/**
 * Resume Uploader Component
 * Integrates with existing profolia.art website to add resume upload functionality
 * Requirements: 6.1, 6.2, 6.6
 */

class ResumeUploader {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        
        // Use global config if available, otherwise use options or defaults
        const config = window.PROFOLIA_CONFIG || {};
        this.options = {
            maxFileSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            apiBaseUrl: config.apiBaseUrl || options.apiBaseUrl || '/api',
            apiKey: config.apiKey || options.apiKey,
            ...options
        };
        
        this.currentJobId = null;
        this.uploadInProgress = false;
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('Resume uploader container not found');
            return;
        }
        
        this.createUploadInterface();
        this.attachEventListeners();
    }
    
    createUploadInterface() {
        this.container.innerHTML = `
            <div class="resume-upload-wrapper">
                <div class="upload-area" id="uploadArea">
                    <div class="upload-content">
                        <div class="upload-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14,2 14,8 20,8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10,9 9,9 8,9"></polyline>
                            </svg>
                        </div>
                        <h3>Upload Your Resume</h3>
                        <p>Drag and drop your resume here, or click to browse</p>
                        <p class="file-requirements">Supports PDF and DOCX files up to 5MB</p>
                        <button type="button" class="browse-button">Choose File</button>
                    </div>
                    <input type="file" id="fileInput" accept=".pdf,.docx" style="display: none;">
                </div>
                
                <div class="upload-progress" id="uploadProgress" style="display: none;">
                    <div class="progress-content">
                        <div class="progress-icon">
                            <div class="spinner"></div>
                        </div>
                        <h3 id="progressTitle">Uploading Resume...</h3>
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>
                        <p id="progressText">Preparing upload...</p>
                    </div>
                </div>
                
                <div class="upload-success" id="uploadSuccess" style="display: none;">
                    <div class="success-content">
                        <div class="success-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20,6 9,17 4,12"></polyline>
                            </svg>
                        </div>
                        <h3>Resume Processed Successfully!</h3>
                        <p>Your portfolio is being generated with AI enhancements.</p>
                        <button type="button" class="view-portfolio-button" id="viewPortfolioButton">
                            View Your Portfolio
                        </button>
                    </div>
                </div>
                
                <div class="upload-error" id="uploadError" style="display: none;">
                    <div class="error-content">
                        <div class="error-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                        <h3>Upload Failed</h3>
                        <p id="errorMessage">Something went wrong. Please try again.</p>
                        <button type="button" class="retry-button" id="retryButton">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const browseButton = this.container.querySelector('.browse-button');
        const retryButton = document.getElementById('retryButton');
        const viewPortfolioButton = document.getElementById('viewPortfolioButton');
        
        // Drag and drop events
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        
        // Click events
        uploadArea.addEventListener('click', () => fileInput.click());
        browseButton.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        retryButton.addEventListener('click', this.resetUploader.bind(this));
        viewPortfolioButton.addEventListener('click', this.viewPortfolio.bind(this));
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    processFile(file) {
        // Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
            this.showError(validation.message);
            return;
        }
        
        this.uploadFile(file);
    }
    
    validateFile(file) {
        // Check file size
        if (file.size > this.options.maxFileSize) {
            return {
                valid: false,
                message: `File size exceeds 5MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`
            };
        }
        
        // Check file type
        if (!this.options.allowedTypes.includes(file.type)) {
            return {
                valid: false,
                message: 'Please upload a PDF or DOCX file only.'
            };
        }
        
        return { valid: true };
    }
    
    async uploadFile(file) {
        if (this.uploadInProgress) return;
        
        this.uploadInProgress = true;
        this.showProgress();
        
        try {
            // Create form data
            const formData = new FormData();
            formData.append('resume', file);
            
            // Update progress
            this.updateProgress(10, 'Uploading file...');
            
            // Upload file
            const headers = {
                // Don't set Content-Type for FormData, let browser set it with boundary
            };
            
            // Add API key if available
            if (this.options.apiKey) {
                headers['X-API-Key'] = this.options.apiKey;
            }
            
            const response = await fetch(`${this.options.apiBaseUrl}/upload-resume`, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            this.currentJobId = result.jobId;
            
            this.updateProgress(30, 'Processing resume...');
            
            // Poll for processing status
            await this.pollProcessingStatus();
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError(error.message || 'Upload failed. Please try again.');
        } finally {
            this.uploadInProgress = false;
        }
    }
    
    async pollProcessingStatus() {
        const maxAttempts = 60; // 5 minutes max
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const headers = {};
                if (this.options.apiKey) {
                    headers['X-API-Key'] = this.options.apiKey;
                }
                
                const response = await fetch(`${this.options.apiBaseUrl}/processing-status/${this.currentJobId}`, {
                    headers: headers
                });
                
                if (!response.ok) {
                    throw new Error('Failed to check processing status');
                }
                
                const status = await response.json();
                
                switch (status.status) {
                    case 'processing':
                        this.updateProgress(30 + (attempts * 2), status.message || 'Processing resume...');
                        break;
                    case 'completed':
                        this.updateProgress(100, 'Portfolio generated successfully!');
                        setTimeout(() => this.showSuccess(), 500);
                        return;
                    case 'failed':
                        throw new Error(status.error || 'Processing failed');
                }
                
                // Wait 5 seconds before next poll
                await new Promise(resolve => setTimeout(resolve, 5000));
                attempts++;
                
            } catch (error) {
                throw error;
            }
        }
        
        throw new Error('Processing timeout. Please try again.');
    }
    
    showProgress() {
        this.hideAllStates();
        document.getElementById('uploadProgress').style.display = 'block';
    }
    
    updateProgress(percentage, message) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = `${Math.min(percentage, 100)}%`;
        progressText.textContent = message;
    }
    
    showSuccess() {
        this.hideAllStates();
        document.getElementById('uploadSuccess').style.display = 'block';
    }
    
    showError(message) {
        this.hideAllStates();
        document.getElementById('uploadError').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }
    
    hideAllStates() {
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('uploadSuccess').style.display = 'none';
        document.getElementById('uploadError').style.display = 'none';
    }
    
    resetUploader() {
        this.currentJobId = null;
        this.uploadInProgress = false;
        this.hideAllStates();
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('fileInput').value = '';
    }
    
    viewPortfolio() {
        if (this.currentJobId) {
            // Trigger portfolio view event
            const event = new CustomEvent('portfolioReady', {
                detail: { jobId: this.currentJobId }
            });
            document.dispatchEvent(event);
        }
    }
}

// Export for use in other modules
window.ResumeUploader = ResumeUploader;