/**
 * User Preference Manager for Profolia.art
 * Handles browser storage, session management, and backend synchronization
 * Requirements: 8.7
 */

class UserPreferenceManager {
    constructor(apiClient, options = {}) {
        this.apiClient = apiClient;
        this.options = {
            storageKey: 'profolia_user_preferences',
            sessionKey: 'profolia_session_preferences',
            syncInterval: 30000, // 30 seconds
            autoSync: true,
            enableSessionStorage: true,
            enableLocalStorage: true,
            ...options
        };
        
        this.preferences = {};
        this.sessionPreferences = {};
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.syncTimer = null;
        
        this.init();
    }
    
    /**
     * Initialize preference manager
     */
    init() {
        // Load preferences from storage
        this.loadFromStorage();
        
        // Set up automatic synchronization
        if (this.options.autoSync && this.apiClient) {
            this.startAutoSync();
        }
        
        // Listen for storage events (cross-tab synchronization)
        window.addEventListener('storage', (e) => {
            if (e.key === this.options.storageKey) {
                this.handleStorageChange(e);
            }
        });
        
        // Listen for beforeunload to save session preferences
        window.addEventListener('beforeunload', () => {
            this.saveSessionPreferences();
        });
        
        // Listen for visibility change to sync when tab becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.options.autoSync) {
                this.syncWithBackend();
            }
        });
    }
    
    /**
     * Load preferences from browser storage
     */
    loadFromStorage() {
        try {
            // Load from localStorage (persistent)
            if (this.options.enableLocalStorage) {
                const stored = localStorage.getItem(this.options.storageKey);
                if (stored) {
                    this.preferences = { ...this.preferences, ...JSON.parse(stored) };
                }
            }
            
            // Load from sessionStorage (current session)
            if (this.options.enableSessionStorage) {
                const sessionStored = sessionStorage.getItem(this.options.sessionKey);
                if (sessionStored) {
                    this.sessionPreferences = JSON.parse(sessionStored);
                }
            }
            
            console.log('Preferences loaded from storage:', {
                persistent: Object.keys(this.preferences).length,
                session: Object.keys(this.sessionPreferences).length
            });
            
        } catch (error) {
            console.error('Failed to load preferences from storage:', error);
            this.preferences = {};
            this.sessionPreferences = {};
        }
    }
    
    /**
     * Save preferences to browser storage
     */
    saveToStorage() {
        try {
            // Save to localStorage (persistent)
            if (this.options.enableLocalStorage) {
                localStorage.setItem(this.options.storageKey, JSON.stringify(this.preferences));
            }
            
            // Save to sessionStorage (current session)
            if (this.options.enableSessionStorage) {
                sessionStorage.setItem(this.options.sessionKey, JSON.stringify(this.sessionPreferences));
            }
            
            console.log('Preferences saved to storage');
            
        } catch (error) {
            console.error('Failed to save preferences to storage:', error);
            throw new Error('Failed to save preferences locally');
        }
    }
    
    /**
     * Get a preference value
     */
    get(key, defaultValue = null) {
        // Session preferences take priority over persistent preferences
        if (this.sessionPreferences.hasOwnProperty(key)) {
            return this.sessionPreferences[key];
        }
        
        if (this.preferences.hasOwnProperty(key)) {
            return this.preferences[key];
        }
        
        return defaultValue;
    }
    
    /**
     * Set a preference value
     */
    set(key, value, options = {}) {
        const {
            persistent = true,
            session = true,
            sync = this.options.autoSync
        } = options;
        
        // Validate key and value
        if (typeof key !== 'string' || key.trim() === '') {
            throw new Error('Preference key must be a non-empty string');
        }
        
        // Set in appropriate storage
        if (persistent) {
            this.preferences[key] = value;
        }
        
        if (session) {
            this.sessionPreferences[key] = value;
        }
        
        // Save to browser storage
        this.saveToStorage();
        
        // Trigger sync if enabled
        if (sync && this.apiClient) {
            this.debouncedSync();
        }
        
        // Emit change event
        this.emitPreferenceChange(key, value);
    }
    
    /**
     * Set multiple preferences at once
     */
    setMultiple(preferences, options = {}) {
        const keys = Object.keys(preferences);
        
        keys.forEach(key => {
            this.set(key, preferences[key], { ...options, sync: false });
        });
        
        // Sync once after all changes
        if (options.sync !== false && this.options.autoSync && this.apiClient) {
            this.debouncedSync();
        }
    }
    
    /**
     * Remove a preference
     */
    remove(key, options = {}) {
        const {
            persistent = true,
            session = true,
            sync = this.options.autoSync
        } = options;
        
        let changed = false;
        
        if (persistent && this.preferences.hasOwnProperty(key)) {
            delete this.preferences[key];
            changed = true;
        }
        
        if (session && this.sessionPreferences.hasOwnProperty(key)) {
            delete this.sessionPreferences[key];
            changed = true;
        }
        
        if (changed) {
            this.saveToStorage();
            
            if (sync && this.apiClient) {
                this.debouncedSync();
            }
            
            this.emitPreferenceChange(key, undefined);
        }
    }
    
    /**
     * Clear all preferences
     */
    clear(options = {}) {
        const {
            persistent = true,
            session = true,
            sync = this.options.autoSync
        } = options;
        
        if (persistent) {
            this.preferences = {};
        }
        
        if (session) {
            this.sessionPreferences = {};
        }
        
        this.saveToStorage();
        
        if (sync && this.apiClient) {
            this.syncWithBackend();
        }
        
        this.emitPreferenceChange('*', null);
    }
    
    /**
     * Get all preferences (merged session and persistent)
     */
    getAll() {
        return {
            ...this.preferences,
            ...this.sessionPreferences
        };
    }
    
    /**
     * Get only persistent preferences
     */
    getPersistent() {
        return { ...this.preferences };
    }
    
    /**
     * Get only session preferences
     */
    getSession() {
        return { ...this.sessionPreferences };
    }
    
    /**
     * Synchronize preferences with backend
     */
    async syncWithBackend() {
        if (!this.apiClient || this.syncInProgress) {
            return false;
        }
        
        try {
            this.syncInProgress = true;
            
            const allPreferences = this.getAll();
            const syncData = {
                preferences: allPreferences,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                sessionId: this.getSessionId()
            };
            
            const result = await this.apiClient.savePreferences(syncData);
            
            if (result.success) {
                this.lastSyncTime = new Date();
                console.log('Preferences synchronized with backend');
                
                // Merge any server-side preferences
                if (result.mergedPreferences) {
                    this.mergeServerPreferences(result.mergedPreferences);
                }
                
                return true;
            } else {
                console.warn('Backend sync completed with warnings:', result.warnings);
                return false;
            }
            
        } catch (error) {
            console.error('Failed to sync preferences with backend:', error);
            return false;
        } finally {
            this.syncInProgress = false;
        }
    }
    
    /**
     * Load preferences from backend
     */
    async loadFromBackend(sessionId = null) {
        if (!this.apiClient) {
            throw new Error('API client is required for backend operations');
        }
        
        try {
            const result = await this.apiClient.request('/load-preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: sessionId || this.getSessionId(),
                    timestamp: new Date().toISOString()
                })
            });
            
            if (result.success && result.preferences) {
                this.mergeServerPreferences(result.preferences);
                return result.preferences;
            }
            
            return null;
            
        } catch (error) {
            console.error('Failed to load preferences from backend:', error);
            throw error;
        }
    }
    
    /**
     * Merge server preferences with local preferences
     */
    mergeServerPreferences(serverPreferences) {
        const merged = { ...this.preferences, ...serverPreferences };
        
        // Only update if there are actual changes
        if (JSON.stringify(merged) !== JSON.stringify(this.preferences)) {
            this.preferences = merged;
            this.saveToStorage();
            
            console.log('Server preferences merged with local preferences');
            this.emitPreferenceChange('*', merged);
        }
    }
    
    /**
     * Start automatic synchronization
     */
    startAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        
        this.syncTimer = setInterval(() => {
            this.syncWithBackend();
        }, this.options.syncInterval);
        
        console.log(`Auto-sync started with ${this.options.syncInterval}ms interval`);
    }
    
    /**
     * Stop automatic synchronization
     */
    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            console.log('Auto-sync stopped');
        }
    }
    
    /**
     * Debounced sync to avoid too frequent backend calls
     */
    debouncedSync() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            this.syncWithBackend();
        }, 2000); // 2 second debounce
    }
    
    /**
     * Handle storage change events (cross-tab sync)
     */
    handleStorageChange(event) {
        try {
            if (event.newValue) {
                const newPreferences = JSON.parse(event.newValue);
                
                // Only update if preferences actually changed
                if (JSON.stringify(newPreferences) !== JSON.stringify(this.preferences)) {
                    this.preferences = newPreferences;
                    console.log('Preferences updated from another tab');
                    this.emitPreferenceChange('*', newPreferences);
                }
            }
        } catch (error) {
            console.error('Failed to handle storage change:', error);
        }
    }
    
    /**
     * Save session-specific preferences
     */
    saveSessionPreferences() {
        try {
            if (this.options.enableSessionStorage) {
                sessionStorage.setItem(this.options.sessionKey, JSON.stringify(this.sessionPreferences));
            }
        } catch (error) {
            console.error('Failed to save session preferences:', error);
        }
    }
    
    /**
     * Get or generate session ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('profolia_session_id');
        
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('profolia_session_id', sessionId);
        }
        
        return sessionId;
    }
    
    /**
     * Emit preference change event
     */
    emitPreferenceChange(key, value) {
        const event = new CustomEvent('preferenceChanged', {
            detail: {
                key,
                value,
                allPreferences: this.getAll(),
                timestamp: new Date().toISOString()
            }
        });
        
        document.dispatchEvent(event);
    }
    
    /**
     * Add preference change listener
     */
    onChange(callback) {
        const listener = (event) => {
            callback(event.detail);
        };
        
        document.addEventListener('preferenceChanged', listener);
        
        // Return unsubscribe function
        return () => {
            document.removeEventListener('preferenceChanged', listener);
        };
    }
    
    /**
     * Export preferences for backup
     */
    export() {
        return {
            persistent: this.getPersistent(),
            session: this.getSession(),
            metadata: {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                sessionId: this.getSessionId()
            }
        };
    }
    
    /**
     * Import preferences from backup
     */
    import(data, options = {}) {
        const {
            mergePersistent = true,
            mergeSession = false,
            sync = true
        } = options;
        
        try {
            if (mergePersistent && data.persistent) {
                this.preferences = { ...this.preferences, ...data.persistent };
            }
            
            if (mergeSession && data.session) {
                this.sessionPreferences = { ...this.sessionPreferences, ...data.session };
            }
            
            this.saveToStorage();
            
            if (sync && this.apiClient) {
                this.syncWithBackend();
            }
            
            console.log('Preferences imported successfully');
            this.emitPreferenceChange('*', this.getAll());
            
        } catch (error) {
            console.error('Failed to import preferences:', error);
            throw new Error('Failed to import preferences');
        }
    }
    
    /**
     * Get sync status information
     */
    getSyncStatus() {
        return {
            lastSyncTime: this.lastSyncTime,
            syncInProgress: this.syncInProgress,
            autoSyncEnabled: !!this.syncTimer,
            hasApiClient: !!this.apiClient
        };
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAutoSync();
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        window.removeEventListener('storage', this.handleStorageChange);
        window.removeEventListener('beforeunload', this.saveSessionPreferences);
        document.removeEventListener('visibilitychange', this.syncWithBackend);
        
        console.log('UserPreferenceManager destroyed');
    }
}

// Export for use in other modules
window.UserPreferenceManager = UserPreferenceManager;