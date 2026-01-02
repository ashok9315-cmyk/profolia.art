/**
 * API Client for Profolia.art
 * Handles API communication with retry logic and error handling
 * Requirements: 6.3, 8.6
 */

class ApiClient {
    constructor(baseUrl, options = {}) {
        // Ensure HTTPS is used for security
        if (baseUrl.startsWith('http://') && !baseUrl.includes('localhost')) {
            console.warn('Converting HTTP to HTTPS for security');
            baseUrl = baseUrl.replace('http://', 'https://');
        }
        
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.options = {
            timeout: 30000, // 30 seconds
            retryAttempts: 3,
            retryDelay: 1000, // 1 second
            ...options
        };
        
        // Validate HTTPS in production
        if (typeof window !== 'undefined' && 
            window.location.protocol === 'https:' && 
            !this.baseUrl.startsWith('https://') &&
            !this.baseUrl.includes('localhost')) {
            throw new Error('HTTPS is required for secure data transmission');
        }
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            timeout: this.options.timeout,
            ...options
        };
        
        let lastError;
        
        for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
            try {
                const response = await this.fetchWithTimeout(url, config);
                
                if (!response.ok) {
                    const errorData = await this.parseErrorResponse(response);
                    throw new ApiError(
                        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
                        response.status,
                        errorData
                    );
                }
                
                return await response.json();
                
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx) except 408, 429
                if (error instanceof ApiError && 
                    error.status >= 400 && 
                    error.status < 500 && 
                    error.status !== 408 && 
                    error.status !== 429) {
                    throw error;
                }
                
                // Don't retry on the last attempt
                if (attempt === this.options.retryAttempts) {
                    break;
                }
                
                // Wait before retrying (exponential backoff)
                const delay = this.options.retryDelay * Math.pow(2, attempt - 1);
                await this.sleep(delay);
                
                console.warn(`API request failed (attempt ${attempt}/${this.options.retryAttempts}):`, error.message);
            }
        }
        
        throw lastError;
    }
    
    async fetchWithTimeout(url, options) {
        // Validate HTTPS for security
        if (!url.startsWith('https://') && !url.includes('localhost')) {
            throw new ApiError('HTTPS is required for secure data transmission', 400);
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);
        
        try {
            // Add security headers
            const secureOptions = {
                ...options,
                signal: controller.signal,
                headers: {
                    ...options.headers,
                    'X-Requested-With': 'XMLHttpRequest' // CSRF protection
                }
            };
            
            const response = await fetch(url, secureOptions);
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new ApiError('Request timeout', 408);
            }
            
            throw new ApiError(`Network error: ${error.message}`, 0);
        }
    }
    
    async parseErrorResponse(response) {
        try {
            return await response.json();
        } catch {
            return { message: response.statusText };
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Convenience methods for common operations
    async uploadResume(file) {
        const formData = new FormData();
        formData.append('resume', file);
        
        return this.request('/api/upload-resume', {
            method: 'POST',
            body: formData
        });
    }
    
    async getProcessingStatus(jobId) {
        return this.request(`/api/processing-status/${jobId}`);
    }
    
    async getPortfolioContent(jobId) {
        return this.request(`/api/portfolio-content/${jobId}`);
    }
    
    async savePreferences(preferences) {
        return this.request('/api/save-preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferences)
        });
    }
    
    async loadPreferences(sessionId) {
        return this.request('/api/load-preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId })
        });
    }
    
    async deletePreferences(sessionId) {
        return this.request(`/api/delete-preferences?sessionId=${encodeURIComponent(sessionId)}`, {
            method: 'DELETE'
        });
    }
    
    async deleteUserData(jobId, reason = 'user_request') {
        return this.request('/api/delete-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ jobId, reason })
        });
    }
    
    async getDeletionStatus(jobId) {
        return this.request(`/api/deletion-status/${jobId}`);
    }
}

class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
    
    get isNetworkError() {
        return this.status === 0;
    }
    
    get isTimeout() {
        return this.status === 408;
    }
    
    get isServerError() {
        return this.status >= 500;
    }
    
    get isClientError() {
        return this.status >= 400 && this.status < 500;
    }
    
    get isRetryable() {
        return this.isNetworkError || this.isTimeout || this.isServerError || this.status === 429;
    }
}

// Export for use in other modules
window.ApiClient = ApiClient;
window.ApiError = ApiError;