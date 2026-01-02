/**
 * Main configuration for profolia.art and www.profolia.art
 */
window.PROFOLIA_CONFIG = {
    apiBaseUrl: 'https://et0ybn33zg.execute-api.us-east-1.amazonaws.com/prod',
    // apiKey: '2IDPgMSw4w3GkaMukb0FxJAzCqYVQlo9Sy388kN0', // Not needed anymore
    environment: 'production',
    domain: 'profolia.art',
    features: {
        aiEnhancement: true,
        realTimePreview: true,
        contentToggle: true,
        analytics: true,
        fullPortfolioDisplay: true
    }
};