/**
 * Data Privacy Manager for Profolia.art
 * Handles user data deletion requests and privacy controls
 * Requirements: 7.3, 7.4
 */

class DataPrivacyManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.deletionInProgress = false;
    }
    
    /**
     * Request deletion of user data
     */
    async requestDataDeletion(jobId, reason = 'user_request') {
        if (this.deletionInProgress) {
            throw new Error('Data deletion already in progress');
        }
        
        if (!jobId || typeof jobId !== 'string') {
            throw new Error('Valid job ID is required for data deletion');
        }
        
        try {
            this.deletionInProgress = true;
            
            const result = await this.apiClient.deleteUserData(jobId, reason);
            
            if (result.success) {
                console.log(`Data deletion completed for job ${jobId}`);
                return {
                    success: true,
                    message: 'Your data has been successfully deleted',
                    deletedFiles: result.deletedFiles,
                    completedAt: result.completedAt
                };
            } else {
                console.warn(`Data deletion completed with errors for job ${jobId}:`, result.errors);
                return {
                    success: false,
                    message: 'Data deletion completed but some files may not have been removed',
                    errors: result.errors,
                    deletedFiles: result.deletedFiles
                };
            }
            
        } catch (error) {
            console.error('Data deletion request failed:', error);
            throw new Error(`Failed to delete data: ${error.message}`);
        } finally {
            this.deletionInProgress = false;
        }
    }
    
    /**
     * Check deletion status for a job ID
     */
    async checkDeletionStatus(jobId) {
        if (!jobId || typeof jobId !== 'string') {
            throw new Error('Valid job ID is required');
        }
        
        try {
            const status = await this.apiClient.getDeletionStatus(jobId);
            return {
                jobId: status.jobId,
                found: status.found,
                deletions: status.deletions || []
            };
        } catch (error) {
            console.error('Failed to check deletion status:', error);
            throw new Error(`Failed to check deletion status: ${error.message}`);
        }
    }
    
    /**
     * Create a data deletion UI component
     */
    createDeletionInterface(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with ID '${containerId}' not found`);
        }
        
        container.innerHTML = `
            <div class="data-privacy-panel">
                <h3>Data Privacy Controls</h3>
                <p>You can request deletion of your uploaded resume and generated portfolio data.</p>
                
                <div class="deletion-form">
                    <label for="jobId">Job ID:</label>
                    <input type="text" id="jobId" placeholder="Enter your job ID" required>
                    
                    <label for="reason">Reason (optional):</label>
                    <select id="reason">
                        <option value="user_request">User Request</option>
                        <option value="privacy_concern">Privacy Concern</option>
                        <option value="data_cleanup">Data Cleanup</option>
                        <option value="other">Other</option>
                    </select>
                    
                    <button id="deleteDataBtn" class="delete-btn">Delete My Data</button>
                    <button id="checkStatusBtn" class="status-btn">Check Deletion Status</button>
                </div>
                
                <div id="deletionResult" class="result-panel" style="display: none;"></div>
            </div>
        `;
        
        // Add event listeners
        const deleteBtn = container.querySelector('#deleteDataBtn');
        const checkBtn = container.querySelector('#checkStatusBtn');
        const jobIdInput = container.querySelector('#jobId');
        const reasonSelect = container.querySelector('#reason');
        const resultPanel = container.querySelector('#deletionResult');
        
        deleteBtn.addEventListener('click', async () => {
            const jobId = jobIdInput.value.trim();
            const reason = reasonSelect.value;
            
            if (!jobId) {
                this.showResult(resultPanel, 'error', 'Please enter a valid job ID');
                return;
            }
            
            try {
                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Deleting...';
                
                const result = await this.requestDataDeletion(jobId, reason);
                
                if (result.success) {
                    this.showResult(resultPanel, 'success', 
                        `Data deletion completed successfully. ${result.deletedFiles} files were removed.`);
                } else {
                    this.showResult(resultPanel, 'warning', 
                        `Data deletion completed with some errors. ${result.deletedFiles} files were removed, but some issues occurred.`);
                }
                
            } catch (error) {
                this.showResult(resultPanel, 'error', error.message);
            } finally {
                deleteBtn.disabled = false;
                deleteBtn.textContent = 'Delete My Data';
            }
        });
        
        checkBtn.addEventListener('click', async () => {
            const jobId = jobIdInput.value.trim();
            
            if (!jobId) {
                this.showResult(resultPanel, 'error', 'Please enter a valid job ID');
                return;
            }
            
            try {
                checkBtn.disabled = true;
                checkBtn.textContent = 'Checking...';
                
                const status = await this.checkDeletionStatus(jobId);
                
                if (status.found && status.deletions.length > 0) {
                    const lastDeletion = status.deletions[status.deletions.length - 1];
                    this.showResult(resultPanel, 'info', 
                        `Data for job ${jobId} was deleted on ${new Date(lastDeletion.deletedAt).toLocaleString()}. ${lastDeletion.filesCount} files were removed.`);
                } else {
                    this.showResult(resultPanel, 'info', 
                        `No deletion history found for job ${jobId}. Data may still exist or was never uploaded.`);
                }
                
            } catch (error) {
                this.showResult(resultPanel, 'error', error.message);
            } finally {
                checkBtn.disabled = false;
                checkBtn.textContent = 'Check Deletion Status';
            }
        });
    }
    
    /**
     * Show result message in the UI
     */
    showResult(panel, type, message) {
        panel.style.display = 'block';
        panel.className = `result-panel ${type}`;
        panel.innerHTML = `
            <div class="result-message">
                <strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${message}
            </div>
        `;
        
        // Auto-hide after 10 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                panel.style.display = 'none';
            }, 10000);
        }
    }
    
    /**
     * Validate job ID format
     */
    static isValidJobId(jobId) {
        if (!jobId || typeof jobId !== 'string') {
            return false;
        }
        
        // Check if it's a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(jobId);
    }
    
    /**
     * Get job ID from URL parameters (if available)
     */
    static getJobIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('jobId') || urlParams.get('job_id');
    }
}

// Export for use in other modules
window.DataPrivacyManager = DataPrivacyManager;