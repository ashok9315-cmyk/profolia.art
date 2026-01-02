/**
 * Content Renderer Component
 * Handles dynamic content rendering and real-time updates for profolia.art
 * Requirements: 6.3, 8.6, 8.4
 */

class ContentRenderer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            apiBaseUrl: options.apiBaseUrl || '/api',
            enablePreview: options.enablePreview !== false,
            autoSave: options.autoSave !== false,
            preferenceManager: options.preferenceManager || null,
            ...options
        };
        
        this.portfolioData = null;
        this.currentView = 'enhanced'; // 'original' or 'enhanced'
        this.previewMode = false;
        this.preferenceManager = this.options.preferenceManager;
        this.preferences = {};
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('Content renderer container not found');
            return;
        }
        
        // Initialize preference manager if not provided
        if (!this.preferenceManager && window.UserPreferenceManager && this.options.apiClient) {
            this.preferenceManager = new window.UserPreferenceManager(this.options.apiClient, {
                storageKey: 'profolia_content_preferences',
                sessionKey: 'profolia_content_session'
            });
        }
        
        // Load preferences from preference manager or fallback to localStorage
        this.loadPreferences();
        
        // Listen for preference changes
        if (this.preferenceManager) {
            this.preferenceManager.onChange((change) => {
                this.handlePreferenceChange(change);
            });
        }
        
        // Apply saved preferences
        if (this.preferences.view) {
            this.currentView = this.preferences.view;
        }
        if (this.preferences.previewMode !== undefined) {
            this.previewMode = this.preferences.previewMode;
        }
    }
    
    async loadPortfolio(jobId) {
        try {
            this.showLoading();
            
            // Use API client if available, otherwise fall back to fetch
            let portfolioData;
            if (window.ApiClient && this.options.apiClient) {
                portfolioData = await this.options.apiClient.getPortfolioContent(jobId);
            } else {
                const response = await fetch(`${this.options.apiBaseUrl}/portfolio-content/${jobId}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to load portfolio: ${response.statusText}`);
                }
                
                portfolioData = await response.json();
            }
            
            this.portfolioData = portfolioData;
            this.renderPortfolio();
            
            return this.portfolioData;
        } catch (error) {
            console.error('Error loading portfolio:', error);
            
            let errorMessage = 'Failed to load portfolio content. Please try again.';
            
            if (error instanceof window.ApiError) {
                if (error.isNetworkError) {
                    errorMessage = 'Network connection error. Please check your internet connection.';
                } else if (error.isTimeout) {
                    errorMessage = 'Request timed out. Please try again.';
                } else if (error.status === 404) {
                    errorMessage = 'Portfolio not found. Please upload your resume again.';
                }
            }
            
            this.showError(errorMessage);
            throw error;
        }
    }
    
    renderPortfolio() {
        if (!this.portfolioData) {
            console.error('No portfolio data to render');
            return;
        }
        
        this.container.innerHTML = `
            <div class="portfolio-wrapper">
                ${this.renderControls()}
                ${this.renderHeroSection()}
                ${this.renderAboutSection()}
                ${this.renderExperienceSection()}
                ${this.renderEducationSection()}
                ${this.renderSkillsSection()}
            </div>
        `;
        
        this.attachEventListeners();
        this.updateRealTime();
    }
    
    renderControls() {
        if (!this.options.enablePreview) return '';
        
        return `
            <div class="portfolio-controls">
                <div class="view-toggle">
                    <button type="button" class="toggle-btn ${this.currentView === 'original' ? 'active' : ''}" 
                            data-view="original">
                        Original Content
                    </button>
                    <button type="button" class="toggle-btn ${this.currentView === 'enhanced' ? 'active' : ''}" 
                            data-view="enhanced">
                        AI Enhanced
                    </button>
                </div>
                
                <div class="preview-controls">
                    <button type="button" class="preview-btn ${this.previewMode ? 'active' : ''}" 
                            data-action="toggle-preview">
                        ${this.previewMode ? 'Exit Preview' : 'Preview Mode'}
                    </button>
                    <button type="button" class="save-btn" data-action="save-preferences">
                        Save Preferences
                    </button>
                </div>
            </div>
        `;
    }
    
    renderHeroSection() {
        const data = this.portfolioData.sections?.hero;
        if (!data) return '';
        
        const content = this.getContentByView(data);
        
        return `
            <section class="hero-section" data-section="hero">
                <div class="hero-content">
                    <h1 class="hero-title">${this.escapeHtml(content.name || '')}</h1>
                    <p class="hero-tagline">${this.escapeHtml(content.tagline || '')}</p>
                    <div class="hero-contact">
                        ${content.email ? `<span class="contact-item">${this.escapeHtml(content.email)}</span>` : ''}
                        ${content.phone ? `<span class="contact-item">${this.escapeHtml(content.phone)}</span>` : ''}
                        ${content.location ? `<span class="contact-item">${this.escapeHtml(content.location)}</span>` : ''}
                    </div>
                </div>
                ${this.previewMode ? this.renderPreviewComparison('hero', data) : ''}
            </section>
        `;
    }
    
    renderAboutSection() {
        const data = this.portfolioData.sections?.about;
        if (!data) return '';
        
        const content = this.getContentByView(data);
        
        return `
            <section class="about-section" data-section="about">
                <div class="section-header">
                    <h2>About Me</h2>
                </div>
                <div class="about-content">
                    <p class="professional-summary">${this.escapeHtml(content.summary || '')}</p>
                    ${content.highlights ? this.renderHighlights(content.highlights) : ''}
                </div>
                ${this.previewMode ? this.renderPreviewComparison('about', data) : ''}
            </section>
        `;
    }
    
    renderExperienceSection() {
        const data = this.portfolioData.sections?.experience;
        if (!data || !Array.isArray(data)) return '';
        
        return `
            <section class="experience-section" data-section="experience">
                <div class="section-header">
                    <h2>Experience</h2>
                </div>
                <div class="experience-list">
                    ${data.map((exp, index) => this.renderExperienceItem(exp, index)).join('')}
                </div>
            </section>
        `;
    }
    
    renderExperienceItem(data, index) {
        const content = this.getContentByView(data);
        
        return `
            <div class="experience-item" data-item="${index}">
                <div class="experience-header">
                    <h3 class="position">${this.escapeHtml(content.position || '')}</h3>
                    <span class="company">${this.escapeHtml(content.company || '')}</span>
                    <span class="duration">${this.escapeHtml(content.duration || '')}</span>
                </div>
                <div class="experience-description">
                    <p>${this.escapeHtml(content.description || '')}</p>
                    ${content.achievements ? this.renderAchievements(content.achievements) : ''}
                </div>
                ${this.previewMode ? this.renderPreviewComparison(`experience-${index}`, data) : ''}
            </div>
        `;
    }
    
    renderEducationSection() {
        const data = this.portfolioData.sections?.education;
        if (!data || !Array.isArray(data)) return '';
        
        return `
            <section class="education-section" data-section="education">
                <div class="section-header">
                    <h2>Education</h2>
                </div>
                <div class="education-list">
                    ${data.map((edu, index) => this.renderEducationItem(edu, index)).join('')}
                </div>
            </section>
        `;
    }
    
    renderEducationItem(data, index) {
        const content = this.getContentByView(data);
        
        return `
            <div class="education-item" data-item="${index}">
                <h3 class="degree">${this.escapeHtml(content.degree || '')}</h3>
                <span class="institution">${this.escapeHtml(content.institution || '')}</span>
                <span class="graduation">${this.escapeHtml(content.graduation || '')}</span>
                ${content.honors ? `<div class="honors">${this.escapeHtml(content.honors)}</div>` : ''}
            </div>
        `;
    }
    
    renderSkillsSection() {
        const data = this.portfolioData.sections?.skills;
        if (!data) return '';
        
        const content = this.getContentByView(data);
        
        return `
            <section class="skills-section" data-section="skills">
                <div class="section-header">
                    <h2>Skills</h2>
                </div>
                <div class="skills-content">
                    ${content.categories ? this.renderSkillCategories(content.categories) : ''}
                </div>
                ${this.previewMode ? this.renderPreviewComparison('skills', data) : ''}
            </section>
        `;
    }
    
    renderSkillCategories(categories) {
        return Object.entries(categories).map(([category, skills]) => `
            <div class="skill-category">
                <h3 class="category-title">${this.escapeHtml(category)}</h3>
                <div class="skill-list">
                    ${Array.isArray(skills) ? skills.map(skill => 
                        `<span class="skill-tag">${this.escapeHtml(skill)}</span>`
                    ).join('') : ''}
                </div>
            </div>
        `).join('');
    }
    
    renderHighlights(highlights) {
        if (!Array.isArray(highlights)) return '';
        
        return `
            <ul class="highlights-list">
                ${highlights.map(highlight => 
                    `<li>${this.escapeHtml(highlight)}</li>`
                ).join('')}
            </ul>
        `;
    }
    
    renderAchievements(achievements) {
        if (!Array.isArray(achievements)) return '';
        
        return `
            <ul class="achievements-list">
                ${achievements.map(achievement => 
                    `<li>${this.escapeHtml(achievement)}</li>`
                ).join('')}
            </ul>
        `;
    }
    
    renderPreviewComparison(sectionId, data) {
        const original = data.original || {};
        const enhanced = data.enhanced || {};
        
        return `
            <div class="preview-comparison" data-section="${sectionId}">
                <div class="comparison-header">
                    <h4>Content Comparison</h4>
                </div>
                <div class="comparison-content">
                    <div class="original-content">
                        <h5>Original</h5>
                        <div class="content-preview">
                            ${this.renderContentPreview(original)}
                        </div>
                    </div>
                    <div class="enhanced-content">
                        <h5>AI Enhanced</h5>
                        <div class="content-preview">
                            ${this.renderContentPreview(enhanced)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderContentPreview(content) {
        if (typeof content === 'string') {
            return this.escapeHtml(content);
        }
        
        if (typeof content === 'object' && content !== null) {
            return Object.entries(content)
                .map(([key, value]) => `<strong>${key}:</strong> ${this.escapeHtml(String(value))}`)
                .join('<br>');
        }
        
        return '';
    }
    
    getContentByView(data) {
        if (!data) return {};
        
        if (this.currentView === 'original' && data.original) {
            return data.original;
        }
        
        if (this.currentView === 'enhanced' && data.enhanced) {
            return data.enhanced;
        }
        
        // Fallback to any available content
        return data.enhanced || data.original || data;
    }
    
    attachEventListeners() {
        // View toggle buttons
        this.container.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
        
        // Preview mode toggle
        const previewBtn = this.container.querySelector('[data-action="toggle-preview"]');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.togglePreviewMode();
            });
        }
        
        // Save preferences
        const saveBtn = this.container.querySelector('[data-action="save-preferences"]');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.savePreferences();
            });
        }
    }
    
    switchView(view) {
        if (view === this.currentView) return;
        
        this.currentView = view;
        this.updateRealTime();
        
        // Update toggle buttons
        this.container.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Auto-save preference if enabled
        if (this.options.autoSave) {
            this.savePreferences();
        }
    }
    
    togglePreviewMode() {
        this.previewMode = !this.previewMode;
        this.renderPortfolio();
        
        // Auto-save preference if enabled
        if (this.options.autoSave) {
            this.savePreferences();
        }
    }
    
    updateRealTime() {
        // Update all content sections with current view
        const sections = this.container.querySelectorAll('[data-section]');
        
        sections.forEach(section => {
            const sectionName = section.dataset.section;
            const data = this.portfolioData.sections?.[sectionName];
            
            if (data) {
                this.updateSectionContent(section, data);
            }
        });
        
        // Trigger custom event for real-time updates
        const event = new CustomEvent('portfolioUpdated', {
            detail: {
                view: this.currentView,
                previewMode: this.previewMode,
                timestamp: new Date().toISOString()
            }
        });
        document.dispatchEvent(event);
    }
    
    updateSectionContent(sectionElement, data) {
        const content = this.getContentByView(data);
        
        // Update text content elements
        const titleElement = sectionElement.querySelector('.hero-title, .position, .degree');
        if (titleElement && content.name) {
            titleElement.textContent = content.name;
        }
        
        const summaryElement = sectionElement.querySelector('.professional-summary, .experience-description p');
        if (summaryElement && content.summary) {
            summaryElement.textContent = content.summary;
        }
        
        // Add transition effect
        sectionElement.style.opacity = '0.7';
        setTimeout(() => {
            sectionElement.style.opacity = '1';
        }, 150);
    }
    
    savePreferences() {
        const newPreferences = {
            view: this.currentView,
            previewMode: this.previewMode,
            timestamp: new Date().toISOString()
        };
        
        this.preferences = newPreferences;
        
        try {
            if (this.preferenceManager) {
                // Use preference manager for enhanced functionality
                this.preferenceManager.setMultiple({
                    'content.view': this.currentView,
                    'content.previewMode': this.previewMode,
                    'content.lastUpdated': new Date().toISOString()
                }, { persistent: true, session: true });
                
                this.showNotification('Preferences saved and synchronized!');
            } else {
                // Fallback to localStorage
                localStorage.setItem('profolia_preferences', JSON.stringify(newPreferences));
                this.showNotification('Preferences saved locally!');
            }
        } catch (error) {
            console.error('Failed to save preferences:', error);
            this.showNotification('Failed to save preferences', 'error');
        }
    }
    
    loadPreferences() {
        try {
            if (this.preferenceManager) {
                // Load from preference manager
                this.preferences = {
                    view: this.preferenceManager.get('content.view', 'enhanced'),
                    previewMode: this.preferenceManager.get('content.previewMode', false),
                    timestamp: this.preferenceManager.get('content.lastUpdated', new Date().toISOString())
                };
            } else {
                // Fallback to localStorage
                const saved = localStorage.getItem('profolia_preferences');
                this.preferences = saved ? JSON.parse(saved) : {};
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
            this.preferences = {};
        }
    }
    
    handlePreferenceChange(change) {
        // Handle preference changes from other tabs or backend sync
        if (change.key === 'content.view' && change.value !== this.currentView) {
            this.switchView(change.value);
        }
        
        if (change.key === 'content.previewMode' && change.value !== this.previewMode) {
            this.previewMode = change.value;
            this.renderPortfolio();
        }
        
        if (change.key === '*') {
            // Full preference reload
            this.loadPreferences();
            this.refresh();
        }
    }
    
    showLoading() {
        this.container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading your portfolio...</p>
            </div>
        `;
    }
    
    showError(message) {
        this.container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Error Loading Portfolio</h3>
                <p>${this.escapeHtml(message)}</p>
                <button type="button" class="retry-btn" onclick="location.reload()">
                    Try Again
                </button>
            </div>
        `;
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Public API methods
    refresh() {
        if (this.portfolioData) {
            this.renderPortfolio();
        }
    }
    
    getPreferences() {
        return { ...this.preferences };
    }
    
    setPreferences(newPreferences) {
        const oldPreferences = { ...this.preferences };
        this.preferences = { ...this.preferences, ...newPreferences };
        
        // Update preference manager if available
        if (this.preferenceManager) {
            const prefUpdates = {};
            
            if (newPreferences.view !== undefined) {
                prefUpdates['content.view'] = newPreferences.view;
            }
            if (newPreferences.previewMode !== undefined) {
                prefUpdates['content.previewMode'] = newPreferences.previewMode;
            }
            
            if (Object.keys(prefUpdates).length > 0) {
                prefUpdates['content.lastUpdated'] = new Date().toISOString();
                this.preferenceManager.setMultiple(prefUpdates, { persistent: true, session: true });
            }
        }
        
        if (newPreferences.view && newPreferences.view !== this.currentView) {
            this.switchView(newPreferences.view);
        }
        
        if (newPreferences.previewMode !== undefined && newPreferences.previewMode !== this.previewMode) {
            this.togglePreviewMode();
        }
    }
}

// Export for use in other modules
window.ContentRenderer = ContentRenderer;