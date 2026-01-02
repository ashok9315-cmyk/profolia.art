/**
 * Manual Input Manager for Profolia.art
 * Handles manual data entry when resume extraction fails
 * Requirements: 2.5
 */

class ManualInputManager {
    constructor(apiClient, options = {}) {
        this.apiClient = apiClient;
        this.options = {
            containerId: 'manual-input-container',
            formId: 'manual-input-form',
            autoSave: true,
            saveInterval: 5000, // Auto-save every 5 seconds
            validateOnChange: true,
            ...options
        };
        
        this.formData = {
            personalInfo: {},
            workExperience: [],
            education: [],
            skills: []
        };
        
        this.validationRules = this.initializeValidationRules();
        this.autoSaveTimer = null;
        this.isVisible = false;
        
        this.init();
    }
    
    /**
     * Initialize the manual input manager
     */
    init() {
        this.createFormHTML();
        this.attachEventListeners();
        
        if (this.options.autoSave) {
            this.startAutoSave();
        }
    }
    
    /**
     * Show manual input form
     */
    show(extractedData = null, reason = 'parsing_failed') {
        const container = document.getElementById(this.options.containerId);
        if (!container) {
            console.error('Manual input container not found');
            return;
        }
        
        // Pre-populate with any extracted data
        if (extractedData) {
            this.formData = { ...this.formData, ...extractedData };
            this.populateForm();
        }
        
        // Show the form
        container.style.display = 'block';
        this.isVisible = true;
        
        // Show appropriate message based on reason
        this.showReasonMessage(reason);
        
        // Focus on first input
        const firstInput = container.querySelector('input, textarea');
        if (firstInput) {
            firstInput.focus();
        }
        
        // Emit event
        this.emitEvent('manualInputShown', { reason, extractedData });
    }
    
    /**
     * Hide manual input form
     */
    hide() {
        const container = document.getElementById(this.options.containerId);
        if (container) {
            container.style.display = 'none';
        }
        
        this.isVisible = false;
        this.emitEvent('manualInputHidden');
    }
    
    /**
     * Create the HTML structure for the manual input form
     */
    createFormHTML() {
        const container = document.getElementById(this.options.containerId);
        if (!container) {
            console.error('Manual input container not found');
            return;
        }
        
        container.innerHTML = `
            <div class="manual-input-overlay">
                <div class="manual-input-modal">
                    <div class="manual-input-header">
                        <h2>Complete Your Portfolio Information</h2>
                        <p id="reason-message" class="reason-message"></p>
                        <button type="button" class="close-btn" id="close-manual-input">&times;</button>
                    </div>
                    
                    <form id="${this.options.formId}" class="manual-input-form">
                        <!-- Personal Information Section -->
                        <div class="form-section">
                            <h3>Personal Information</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="full-name">Full Name *</label>
                                    <input type="text" id="full-name" name="personalInfo.name" required>
                                    <span class="error-message" id="full-name-error"></span>
                                </div>
                                <div class="form-group">
                                    <label for="email">Email *</label>
                                    <input type="email" id="email" name="personalInfo.email" required>
                                    <span class="error-message" id="email-error"></span>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="phone">Phone</label>
                                    <input type="tel" id="phone" name="personalInfo.phone">
                                </div>
                                <div class="form-group">
                                    <label for="location">Location</label>
                                    <input type="text" id="location" name="personalInfo.location">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="linkedin">LinkedIn URL</label>
                                    <input type="url" id="linkedin" name="personalInfo.linkedIn">
                                </div>
                                <div class="form-group">
                                    <label for="github">GitHub URL</label>
                                    <input type="url" id="github" name="personalInfo.github">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Work Experience Section -->
                        <div class="form-section">
                            <h3>Work Experience</h3>
                            <div id="work-experience-container">
                                <!-- Work experience entries will be added here -->
                            </div>
                            <button type="button" class="add-btn" id="add-work-experience">+ Add Work Experience</button>
                        </div>
                        
                        <!-- Education Section -->
                        <div class="form-section">
                            <h3>Education</h3>
                            <div id="education-container">
                                <!-- Education entries will be added here -->
                            </div>
                            <button type="button" class="add-btn" id="add-education">+ Add Education</button>
                        </div>
                        
                        <!-- Skills Section -->
                        <div class="form-section">
                            <h3>Skills</h3>
                            <div class="form-group">
                                <label for="skills-input">Skills (comma-separated)</label>
                                <textarea id="skills-input" name="skills" rows="4" 
                                    placeholder="JavaScript, Python, React, Node.js, AWS, etc."></textarea>
                                <span class="help-text">Enter your skills separated by commas</span>
                            </div>
                        </div>
                        
                        <!-- Form Actions -->
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="save-draft">Save Draft</button>
                            <button type="button" class="btn btn-secondary" id="preview-portfolio">Preview Portfolio</button>
                            <button type="submit" class="btn btn-primary">Generate Portfolio</button>
                        </div>
                    </form>
                    
                    <!-- Progress Indicator -->
                    <div class="progress-indicator" id="save-progress" style="display: none;">
                        <span class="progress-text">Saving...</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add initial work experience and education entries
        this.addWorkExperienceEntry();
        this.addEducationEntry();
    }
    
    /**
     * Attach event listeners to form elements
     */
    attachEventListeners() {
        const form = document.getElementById(this.options.formId);
        const closeBtn = document.getElementById('close-manual-input');
        const addWorkBtn = document.getElementById('add-work-experience');
        const addEducationBtn = document.getElementById('add-education');
        const saveDraftBtn = document.getElementById('save-draft');
        const previewBtn = document.getElementById('preview-portfolio');
        
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
            form.addEventListener('input', (e) => this.handleInputChange(e));
            form.addEventListener('change', (e) => this.handleInputChange(e));
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        if (addWorkBtn) {
            addWorkBtn.addEventListener('click', () => this.addWorkExperienceEntry());
        }
        
        if (addEducationBtn) {
            addEducationBtn.addEventListener('click', () => this.addEducationEntry());
        }
        
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }
        
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewPortfolio());
        }
        
        // Handle escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    
    /**
     * Add a work experience entry
     */
    addWorkExperienceEntry(data = {}) {
        const container = document.getElementById('work-experience-container');
        const index = container.children.length;
        
        const entryHTML = `
            <div class="dynamic-entry work-experience-entry" data-index="${index}">
                <div class="entry-header">
                    <h4>Work Experience ${index + 1}</h4>
                    <button type="button" class="remove-btn" onclick="this.closest('.dynamic-entry').remove()">Remove</button>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Company *</label>
                        <input type="text" name="workExperience[${index}].company" value="${data.company || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Position *</label>
                        <input type="text" name="workExperience[${index}].position" value="${data.position || ''}" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Start Date</label>
                        <input type="month" name="workExperience[${index}].startDate" value="${this.formatDateForInput(data.startDate)}">
                    </div>
                    <div class="form-group">
                        <label>End Date</label>
                        <input type="month" name="workExperience[${index}].endDate" value="${this.formatDateForInput(data.endDate)}">
                        <label class="checkbox-label">
                            <input type="checkbox" name="workExperience[${index}].current" ${data.current ? 'checked' : ''}>
                            Current Position
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="workExperience[${index}].description" rows="3">${data.description || ''}</textarea>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', entryHTML);
        
        // Handle current position checkbox
        const currentCheckbox = container.querySelector(`input[name="workExperience[${index}].current"]`);
        const endDateInput = container.querySelector(`input[name="workExperience[${index}].endDate"]`);
        
        if (currentCheckbox && endDateInput) {
            currentCheckbox.addEventListener('change', (e) => {
                endDateInput.disabled = e.target.checked;
                if (e.target.checked) {
                    endDateInput.value = '';
                }
            });
        }
    }
    
    /**
     * Add an education entry
     */
    addEducationEntry(data = {}) {
        const container = document.getElementById('education-container');
        const index = container.children.length;
        
        const entryHTML = `
            <div class="dynamic-entry education-entry" data-index="${index}">
                <div class="entry-header">
                    <h4>Education ${index + 1}</h4>
                    <button type="button" class="remove-btn" onclick="this.closest('.dynamic-entry').remove()">Remove</button>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Institution *</label>
                        <input type="text" name="education[${index}].institution" value="${data.institution || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Degree *</label>
                        <input type="text" name="education[${index}].degree" value="${data.degree || ''}" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Field of Study</label>
                        <input type="text" name="education[${index}].field" value="${data.field || ''}">
                    </div>
                    <div class="form-group">
                        <label>Graduation Date</label>
                        <input type="month" name="education[${index}].graduationDate" value="${this.formatDateForInput(data.graduationDate)}">
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', entryHTML);
    }
    
    /**
     * Handle form input changes
     */
    handleInputChange(event) {
        const { name, value, type, checked } = event.target;
        
        // Update form data
        this.updateFormData(name, type === 'checkbox' ? checked : value);
        
        // Validate field if enabled
        if (this.options.validateOnChange) {
            this.validateField(event.target);
        }
        
        // Trigger auto-save
        if (this.options.autoSave) {
            this.debouncedAutoSave();
        }
        
        // Emit change event
        this.emitEvent('formDataChanged', { name, value: type === 'checkbox' ? checked : value });
    }
    
    /**
     * Handle form submission
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        try {
            // Validate entire form
            const isValid = this.validateForm();
            if (!isValid) {
                this.showValidationErrors();
                return;
            }
            
            // Collect all form data
            const formData = this.collectFormData();
            
            // Show loading state
            this.setLoadingState(true);
            
            // Submit to portfolio generation
            const result = await this.submitToPortfolioGeneration(formData);
            
            if (result.success) {
                this.emitEvent('portfolioGenerated', result);
                this.hide();
            } else {
                throw new Error(result.message || 'Failed to generate portfolio');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.showError('Failed to generate portfolio. Please try again.');
        } finally {
            this.setLoadingState(false);
        }
    }
    
    /**
     * Collect all form data
     */
    collectFormData() {
        const form = document.getElementById(this.options.formId);
        const formData = new FormData(form);
        const data = {
            personalInfo: {},
            workExperience: [],
            education: [],
            skills: []
        };
        
        // Process form data
        for (const [name, value] of formData.entries()) {
            this.setNestedValue(data, name, value);
        }
        
        // Process skills
        const skillsText = formData.get('skills');
        if (skillsText) {
            data.skills = skillsText.split(',')
                .map(skill => skill.trim())
                .filter(skill => skill.length > 0)
                .map(skill => ({ name: skill, category: 'technical' }));
        }
        
        // Clean up arrays (remove empty entries)
        data.workExperience = data.workExperience.filter(exp => exp && exp.company && exp.position);
        data.education = data.education.filter(edu => edu && edu.institution && edu.degree);
        
        return data;
    }
    
    /**
     * Set nested object value from dot notation
     */
    setNestedValue(obj, path, value) {
        const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            const nextKey = keys[i + 1];
            
            if (!current[key]) {
                current[key] = isNaN(nextKey) ? {} : [];
            }
            
            current = current[key];
        }
        
        const finalKey = keys[keys.length - 1];
        current[finalKey] = value;
    }
    
    /**
     * Validate the entire form
     */
    validateForm() {
        const form = document.getElementById(this.options.formId);
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    /**
     * Validate a single field
     */
    validateField(field) {
        const { name, value, type, required } = field;
        const errorElement = document.getElementById(`${field.id}-error`);
        let isValid = true;
        let errorMessage = '';
        
        // Required field validation
        if (required && !value.trim()) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        
        // Type-specific validation
        if (value && type === 'email' && !this.isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
        
        if (value && type === 'url' && !this.isValidUrl(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid URL';
        }
        
        // Update error display
        if (errorElement) {
            errorElement.textContent = errorMessage;
            errorElement.style.display = errorMessage ? 'block' : 'none';
        }
        
        // Update field styling
        field.classList.toggle('error', !isValid);
        
        return isValid;
    }
    
    /**
     * Show reason message
     */
    showReasonMessage(reason) {
        const messageElement = document.getElementById('reason-message');
        if (!messageElement) return;
        
        const messages = {
            parsing_failed: 'We couldn\'t automatically extract all information from your resume. Please complete the missing details below.',
            incomplete_extraction: 'Some information was extracted from your resume, but we need a few more details to complete your portfolio.',
            user_requested: 'You can manually enter or edit your information below.',
            file_error: 'There was an issue processing your resume file. Please enter your information manually.'
        };
        
        messageElement.textContent = messages[reason] || messages.parsing_failed;
    }
    
    /**
     * Populate form with existing data
     */
    populateForm() {
        // Populate personal info
        Object.keys(this.formData.personalInfo).forEach(key => {
            const input = document.querySelector(`[name="personalInfo.${key}"]`);
            if (input) {
                input.value = this.formData.personalInfo[key] || '';
            }
        });
        
        // Populate work experience
        this.formData.workExperience.forEach((exp, index) => {
            if (index > 0) { // First entry already exists
                this.addWorkExperienceEntry(exp);
            } else {
                // Populate first entry
                Object.keys(exp).forEach(key => {
                    const input = document.querySelector(`[name="workExperience[0].${key}"]`);
                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = exp[key];
                        } else {
                            input.value = exp[key] || '';
                        }
                    }
                });
            }
        });
        
        // Populate education
        this.formData.education.forEach((edu, index) => {
            if (index > 0) { // First entry already exists
                this.addEducationEntry(edu);
            } else {
                // Populate first entry
                Object.keys(edu).forEach(key => {
                    const input = document.querySelector(`[name="education[0].${key}"]`);
                    if (input) {
                        input.value = edu[key] || '';
                    }
                });
            }
        });
        
        // Populate skills
        if (this.formData.skills && this.formData.skills.length > 0) {
            const skillsInput = document.getElementById('skills-input');
            if (skillsInput) {
                const skillNames = this.formData.skills.map(skill => 
                    typeof skill === 'string' ? skill : skill.name
                );
                skillsInput.value = skillNames.join(', ');
            }
        }
    }
    
    /**
     * Save draft
     */
    async saveDraft() {
        try {
            const formData = this.collectFormData();
            
            // Show saving indicator
            this.showSaveProgress(true);
            
            // Save to local storage
            localStorage.setItem('profolia_manual_input_draft', JSON.stringify({
                data: formData,
                savedAt: new Date().toISOString()
            }));
            
            // Optionally save to backend if user has session
            if (this.apiClient) {
                try {
                    await this.apiClient.savePreferences({
                        preferences: { manualInputDraft: formData },
                        timestamp: new Date().toISOString(),
                        sessionId: this.getSessionId()
                    });
                } catch (error) {
                    console.warn('Failed to save draft to backend:', error);
                }
            }
            
            this.showSaveProgress(false, 'Draft saved successfully');
            this.emitEvent('draftSaved', formData);
            
        } catch (error) {
            console.error('Save draft error:', error);
            this.showSaveProgress(false, 'Failed to save draft');
        }
    }
    
    /**
     * Load draft
     */
    loadDraft() {
        try {
            const saved = localStorage.getItem('profolia_manual_input_draft');
            if (saved) {
                const { data, savedAt } = JSON.parse(saved);
                
                // Check if draft is not too old (7 days)
                const draftAge = Date.now() - new Date(savedAt).getTime();
                if (draftAge < 7 * 24 * 60 * 60 * 1000) {
                    this.formData = data;
                    this.populateForm();
                    this.emitEvent('draftLoaded', data);
                    return true;
                }
            }
        } catch (error) {
            console.error('Load draft error:', error);
        }
        
        return false;
    }
    
    /**
     * Preview portfolio
     */
    async previewPortfolio() {
        try {
            const formData = this.collectFormData();
            
            // Validate required fields
            if (!formData.personalInfo.name || !formData.personalInfo.email) {
                this.showError('Please fill in at least your name and email to preview the portfolio.');
                return;
            }
            
            this.emitEvent('previewRequested', formData);
            
        } catch (error) {
            console.error('Preview error:', error);
            this.showError('Failed to generate preview');
        }
    }
    
    /**
     * Submit to portfolio generation
     */
    async submitToPortfolioGeneration(formData) {
        // This would integrate with the existing portfolio generation pipeline
        // For now, we'll emit an event that the main application can handle
        
        const result = {
            success: true,
            jobId: 'manual_' + Date.now(),
            data: formData,
            source: 'manual_input'
        };
        
        return result;
    }
    
    /**
     * Utility methods
     */
    formatDateForInput(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().slice(0, 7); // YYYY-MM format
    }
    
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    getSessionId() {
        return sessionStorage.getItem('profolia_session_id') || 'manual_session_' + Date.now();
    }
    
    updateFormData(name, value) {
        this.setNestedValue(this.formData, name, value);
    }
    
    debouncedAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            this.saveDraft();
        }, this.options.saveInterval);
    }
    
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            if (this.isVisible) {
                this.saveDraft();
            }
        }, this.options.saveInterval);
    }
    
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }
    
    setLoadingState(loading) {
        const form = document.getElementById(this.options.formId);
        const submitBtn = form?.querySelector('button[type="submit"]');
        
        if (submitBtn) {
            submitBtn.disabled = loading;
            submitBtn.textContent = loading ? 'Generating...' : 'Generate Portfolio';
        }
    }
    
    showSaveProgress(saving, message = null) {
        const progressElement = document.getElementById('save-progress');
        if (!progressElement) return;
        
        if (saving) {
            progressElement.style.display = 'block';
            progressElement.querySelector('.progress-text').textContent = 'Saving...';
        } else {
            if (message) {
                progressElement.querySelector('.progress-text').textContent = message;
                setTimeout(() => {
                    progressElement.style.display = 'none';
                }, 2000);
            } else {
                progressElement.style.display = 'none';
            }
        }
    }
    
    showError(message) {
        // Create or update error display
        let errorElement = document.getElementById('manual-input-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'manual-input-error';
            errorElement.className = 'error-banner';
            
            const form = document.getElementById(this.options.formId);
            form.insertBefore(errorElement, form.firstChild);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
    
    showValidationErrors() {
        this.showError('Please fix the errors below and try again.');
    }
    
    initializeValidationRules() {
        return {
            required: (value) => value && value.trim().length > 0,
            email: (value) => this.isValidEmail(value),
            url: (value) => this.isValidUrl(value)
        };
    }
    
    emitEvent(eventName, data = null) {
        const event = new CustomEvent(`manualInput:${eventName}`, {
            detail: data
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAutoSave();
        this.hide();
        
        // Remove event listeners
        const form = document.getElementById(this.options.formId);
        if (form) {
            form.removeEventListener('submit', this.handleSubmit);
            form.removeEventListener('input', this.handleInputChange);
            form.removeEventListener('change', this.handleInputChange);
        }
        
        console.log('ManualInputManager destroyed');
    }
}

// Export for use in other modules
window.ManualInputManager = ManualInputManager;