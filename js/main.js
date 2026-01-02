/**
 * Main JavaScript for Profolia.art
 * Handles initialization and integration of all components
 */

// Configuration
const CONFIG = {
    // Use your production API endpoint
    apiBaseUrl: 'https://et0ybn33zg.execute-api.us-east-1.amazonaws.com/prod',
    
    // API client options
    apiOptions: {
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
    },
    
    // Resume uploader options
    uploaderOptions: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    },
    
    // Content renderer options
    rendererOptions: {
        enablePreview: true,
        autoSave: true
    }
};

// Global variables
let apiClient = null;
let uploader = null;
let renderer = null;

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 Profolia.art - Initializing...');
    
    try {
        initializeApiClient();
        initializeResumeUploader();
        initializeEventListeners();
        initializeScrollEffects();
        
        console.log('✅ Profolia.art - Initialization complete!');
    } catch (error) {
        console.error('❌ Profolia.art - Initialization failed:', error);
        showNotification('Failed to initialize application. Please refresh the page.', 'error');
    }
});

/**
 * Initialize API client
 */
function initializeApiClient() {
    if (!window.ApiClient) {
        throw new Error('ApiClient not loaded');
    }
    
    apiClient = new window.ApiClient(CONFIG.apiBaseUrl, CONFIG.apiOptions);
    console.log('📡 API Client initialized:', CONFIG.apiBaseUrl);
}

/**
 * Initialize resume uploader component
 */
function initializeResumeUploader() {
    if (!window.ResumeUploader) {
        throw new Error('ResumeUploader not loaded');
    }
    
    const uploaderContainer = document.getElementById('resumeUploaderContainer');
    if (!uploaderContainer) {
        console.warn('Resume uploader container not found');
        return;
    }
    
    uploader = new window.ResumeUploader('resumeUploaderContainer', {
        ...CONFIG.uploaderOptions,
        apiBaseUrl: CONFIG.apiBaseUrl,
        apiClient: apiClient
    });
    
    console.log('📤 Resume Uploader initialized');
}

/**
 * Initialize content renderer when needed
 */
function initializeContentRenderer() {
    if (!window.ContentRenderer) {
        throw new Error('ContentRenderer not loaded');
    }
    
    if (renderer) {
        return renderer; // Already initialized
    }
    
    const rendererContainer = document.getElementById('portfolioContent');
    if (!rendererContainer) {
        throw new Error('Portfolio content container not found');
    }
    
    renderer = new window.ContentRenderer('portfolioContent', {
        ...CONFIG.rendererOptions,
        apiBaseUrl: CONFIG.apiBaseUrl,
        apiClient: apiClient
    });
    
    console.log('🎨 Content Renderer initialized');
    return renderer;
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Portfolio ready event (from resume uploader)
    document.addEventListener('portfolioReady', handlePortfolioReady);
    
    // Portfolio updated event (from content renderer)
    document.addEventListener('portfolioUpdated', handlePortfolioUpdated);
    
    // Search form enhancement
    enhanceSearchForm();
    
    // Navigation enhancement
    enhanceNavigation();
    
    // Contact form enhancement
    enhanceContactForm();
    
    // Keyboard shortcuts
    initializeKeyboardShortcuts();
    
    // Network status monitoring
    initializeNetworkMonitoring();
    
    console.log('🎯 Event listeners initialized');
}

/**
 * Handle portfolio ready event
 */
function handlePortfolioReady(event) {
    console.log('🎉 Portfolio ready:', event.detail);
    
    const jobId = event.detail.jobId;
    if (!jobId) {
        console.error('No job ID provided in portfolio ready event');
        return;
    }
    
    try {
        // Initialize content renderer if not already done
        const contentRenderer = initializeContentRenderer();
        
        // Load portfolio content
        contentRenderer.loadPortfolio(jobId).then(() => {
            // Show portfolio section with smooth animation
            showPortfolioSection();
            
            // Track analytics
            trackEvent('portfolio_generated', {
                job_id: jobId,
                timestamp: new Date().toISOString()
            });
            
            // Show success notification
            showNotification('🎉 Your AI-enhanced portfolio is ready!', 'success');
            
        }).catch(error => {
            console.error('Failed to load portfolio:', error);
            showPortfolioError(error);
        });
        
    } catch (error) {
        console.error('Failed to initialize content renderer:', error);
        showNotification('Failed to display portfolio. Please try again.', 'error');
    }
}

/**
 * Handle portfolio updated event
 */
function handlePortfolioUpdated(event) {
    console.log('🔄 Portfolio updated:', event.detail);
    
    // Track analytics
    trackEvent('portfolio_view_changed', {
        view_type: event.detail.view,
        preview_mode: event.detail.previewMode,
        timestamp: event.detail.timestamp
    });
}

/**
 * Show portfolio section with animation
 */
function showPortfolioSection() {
    const portfolioSection = document.getElementById('portfolio');
    if (!portfolioSection) {
        console.error('Portfolio section not found');
        return;
    }
    
    // Show section
    portfolioSection.style.display = 'block';
    
    // Smooth scroll to portfolio
    portfolioSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
    
    // Add entrance animation
    portfolioSection.style.opacity = '0';
    portfolioSection.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
        portfolioSection.style.transition = 'all 0.6s ease';
        portfolioSection.style.opacity = '1';
        portfolioSection.style.transform = 'translateY(0)';
    }, 100);
}

/**
 * Show portfolio error
 */
function showPortfolioError(error) {
    const portfolioContent = document.getElementById('portfolioContent');
    if (!portfolioContent) return;
    
    let errorMessage = 'Failed to load your portfolio. Please try uploading your resume again.';
    
    if (error instanceof window.ApiError) {
        if (error.isNetworkError) {
            errorMessage = 'Network connection error. Please check your internet connection and try again.';
        } else if (error.isTimeout) {
            errorMessage = 'Request timed out. Please try again.';
        } else if (error.status === 404) {
            errorMessage = 'Portfolio not found. Please upload your resume again.';
        }
    }
    
    portfolioContent.innerHTML = `
        <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>Portfolio Loading Failed</h3>
            <p>${errorMessage}</p>
            <button type="button" class="retry-btn" onclick="location.reload()">
                Start Over
            </button>
        </div>
    `;
    
    // Show portfolio section
    document.getElementById('portfolio').style.display = 'block';
    document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Enhance search form functionality
 */
function enhanceSearchForm() {
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    
    if (!searchInput || !searchForm) return;
    
    // Add focus effects
    searchInput.addEventListener('focus', function() {
        this.parentElement.style.borderColor = 'var(--primary)';
        this.parentElement.style.boxShadow = '0 8px 32px rgba(0, 212, 255, 0.3)';
    });
    
    searchInput.addEventListener('blur', function() {
        this.parentElement.style.borderColor = 'rgba(0, 212, 255, 0.3)';
        this.parentElement.style.boxShadow = '0 8px 32px rgba(0, 212, 255, 0.1)';
    });
    
    // Add search suggestions (future enhancement)
    searchInput.addEventListener('input', function() {
        // Could add search suggestions here
        const value = this.value.trim();
        if (value.length > 2) {
            // Show suggestions dropdown
        }
    });
}

/**
 * Enhance navigation
 */
function enhanceNavigation() {
    // Smooth scroll for navigation links
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add active navigation highlighting
    window.addEventListener('scroll', updateActiveNavigation);
}

/**
 * Update active navigation based on scroll position
 */
function updateActiveNavigation() {
    const sections = ['featured', 'ai', 'upload', 'services', 'contact'];
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    
    let currentSection = '';
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 100 && rect.bottom >= 100) {
                currentSection = sectionId;
            }
        }
    });
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${currentSection}`) {
            link.style.color = 'var(--primary)';
        } else {
            link.style.color = 'var(--text)';
        }
    });
}

/**
 * Enhance contact form
 */
function enhanceContactForm() {
    const contactForm = document.querySelector('.contact-form');
    if (!contactForm) return;
    
    // Add form validation
    contactForm.addEventListener('submit', function(e) {
        if (!validateContactForm(this)) {
            e.preventDefault();
            return false;
        }
    });
    
    // Add real-time validation
    const inputs = contactForm.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
    });
}

/**
 * Validate contact form
 */
function validateContactForm(form) {
    const formData = new FormData(form);
    const name = formData.get('name')?.trim();
    const email = formData.get('email')?.trim();
    const service = formData.get('service');
    const message = formData.get('message')?.trim();
    
    let isValid = true;
    
    if (!name || name.length < 2) {
        showFieldError('name', 'Please enter a valid name');
        isValid = false;
    }
    
    if (!email || !isValidEmail(email)) {
        showFieldError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    if (!service) {
        showFieldError('service', 'Please select a service');
        isValid = false;
    }
    
    if (!message || message.length < 10) {
        showFieldError('message', 'Please enter a message (at least 10 characters)');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Validate individual field
 */
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    
    clearFieldError(fieldName);
    
    switch (fieldName) {
        case 'name':
            if (!value || value.length < 2) {
                showFieldError(fieldName, 'Please enter a valid name');
                return false;
            }
            break;
        case 'email':
            if (!value || !isValidEmail(value)) {
                showFieldError(fieldName, 'Please enter a valid email address');
                return false;
            }
            break;
        case 'message':
            if (!value || value.length < 10) {
                showFieldError(fieldName, 'Please enter a message (at least 10 characters)');
                return false;
            }
            break;
    }
    
    return true;
}

/**
 * Show field error
 */
function showFieldError(fieldName, message) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (!field) return;
    
    field.style.borderColor = '#dc3545';
    
    // Remove existing error message
    clearFieldError(fieldName);
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '0.8rem';
    errorDiv.style.marginTop = '0.25rem';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

/**
 * Clear field error
 */
function clearFieldError(fieldName) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (!field) return;
    
    field.style.borderColor = 'rgba(0, 212, 255, 0.2)';
    
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Initialize keyboard shortcuts
 */
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Only if no input is focused
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA') {
            return;
        }
        
        // Ctrl/Cmd + U: Focus upload section
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Ctrl/Cmd + S: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('searchInput')?.focus();
        }
        
        // Escape: Close any modals or reset focus
        if (e.key === 'Escape') {
            document.activeElement?.blur();
        }
        
        // Portfolio-specific shortcuts (only if renderer is initialized)
        if (renderer) {
            // Ctrl/Cmd + 1: Switch to original view
            if ((e.ctrlKey || e.metaKey) && e.key === '1') {
                e.preventDefault();
                renderer.setPreferences({ view: 'original' });
            }
            
            // Ctrl/Cmd + 2: Switch to enhanced view
            if ((e.ctrlKey || e.metaKey) && e.key === '2') {
                e.preventDefault();
                renderer.setPreferences({ view: 'enhanced' });
            }
            
            // Ctrl/Cmd + P: Toggle preview mode
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                const currentPrefs = renderer.getPreferences();
                renderer.setPreferences({ previewMode: !currentPrefs.previewMode });
            }
        }
    });
}

/**
 * Initialize network monitoring
 */
function initializeNetworkMonitoring() {
    window.addEventListener('online', function() {
        console.log('🌐 Connection restored');
        showNotification('Connection restored', 'success');
    });
    
    window.addEventListener('offline', function() {
        console.log('📡 Connection lost');
        showNotification('Connection lost. Some features may not work.', 'error');
    });
}

/**
 * Initialize scroll effects
 */
function initializeScrollEffects() {
    // Add intersection observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe sections for scroll animations
    document.querySelectorAll('.featured, .ai-section, .services, .contact-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'all 0.6s ease';
        observer.observe(section);
    });
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        color: '#ffffff',
        fontWeight: '500',
        zIndex: '1000',
        animation: 'slideIn 0.3s ease',
        maxWidth: '400px',
        wordWrap: 'break-word'
    });
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.background = '#28a745';
            break;
        case 'error':
            notification.style.background = '#dc3545';
            break;
        case 'warning':
            notification.style.background = '#ffc107';
            notification.style.color = '#212529';
            break;
        default:
            notification.style.background = '#007bff';
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

/**
 * Track analytics event
 */
function trackEvent(eventName, properties = {}) {
    // Google Analytics 4
    if (window.gtag) {
        window.gtag('event', eventName, properties);
    }
    
    // Console log for development
    console.log('📊 Analytics:', eventName, properties);
}

/**
 * Original search and portfolio functions (preserved from original HTML)
 */
function handleSearch(event) {
    event.preventDefault();
    const searchInput = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (searchInput) {
        // Track search
        trackEvent('portfolio_search', {
            search_term: searchInput,
            timestamp: new Date().toISOString()
        });
        
        // Navigate to portfolio
        window.location.href = `${searchInput}/`;
    }
}

function goToPortfolio(category) {
    const examplePortfolios = {
        'photographer': 'photosbyvetri',
        'musician': 'musicbyalex',
        'dancer': 'dancewithjoy',
        'technologist': 'codebysmith',
        'artist': 'artbycreate',
        'designer': 'designstudio'
    };
    
    const username = examplePortfolios[category] || category;
    
    // Track category selection
    trackEvent('category_selected', {
        category: category,
        username: username,
        timestamp: new Date().toISOString()
    });
    
    window.location.href = `${username}/`;
}

/**
 * Handle contact form submission
 */
function handleContactSubmit(event) {
    event.preventDefault();
    
    if (!validateContactForm(event.target)) {
        return false;
    }
    
    const formData = new FormData(event.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const service = formData.get('service');
    const message = formData.get('message');
    
    // Track contact form submission
    trackEvent('contact_form_submitted', {
        service: service,
        timestamp: new Date().toISOString()
    });
    
    // Create mailto link
    const subject = `Profolia Service Inquiry - ${service}`;
    const body = `Name: ${name}%0AEmail: ${email}%0AService: ${service}%0A%0AMessage:%0A${message}`;
    window.location.href = `mailto:ashok9315@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;
    
    // Show success message
    showNotification('Thank you! Your message has been prepared. Your email client should open shortly.', 'success');
    
    // Reset form
    event.target.reset();
    
    return false;
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .error-state {
        text-align: center;
        padding: 4rem 2rem;
        background: rgba(10, 14, 39, 0.8);
        border: 1px solid rgba(220, 53, 69, 0.3);
        border-radius: 15px;
        margin: 2rem 0;
    }
    
    .error-state .error-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: #dc3545;
    }
    
    .error-state h3 {
        color: var(--light);
        margin-bottom: 1rem;
        font-size: 1.5rem;
    }
    
    .error-state p {
        color: var(--text);
        margin-bottom: 2rem;
        line-height: 1.6;
    }
    
    .error-state .retry-btn {
        background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
        color: var(--darker);
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .error-state .retry-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 212, 255, 0.4);
    }
`;
document.head.appendChild(style);

// Export functions for global access
window.handleSearch = handleSearch;
window.goToPortfolio = goToPortfolio;
window.handleContactSubmit = handleContactSubmit;